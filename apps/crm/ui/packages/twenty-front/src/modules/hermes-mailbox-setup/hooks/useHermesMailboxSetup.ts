import { zodResolver } from '@hookform/resolvers/zod';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { ACCOUNT_TYPES } from 'kovaa-lab-shared/constants';
import { isDefined } from 'kovaa-lab-shared/utils';
import {
  type ConnectionParametersInput,
  SaveImapSmtpCaldavAccountDocument,
} from '~/generated-metadata/graphql';

import { type ImapSmtpCaldavAccountInput } from '@/accounts/types/ImapSmtpCaldavAccountInput';
import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { GET_MY_CONNECTED_ACCOUNTS } from '@/settings/accounts/graphql/queries/getMyConnectedAccounts';
import { type ConnectionFormData } from '@/settings/accounts/hooks/useImapSmtpCaldavConnectionForm';
import { isProtocolConfigured } from '@/settings/accounts/utils/isProtocolConfigured';
import { getConnectionImapSmtpCalDavSchema } from '@/settings/accounts/validation-schemas/connectionImapSmtpCalDav';
import { useToast } from 'kovaa-lab-ui/components/feedback';

import { buildHermesMailboxFormDefaults } from '@/hermes-mailbox-setup/constants/hermesMailboxProtocolDefaults';

// What a mailbox creation attempt ended as.
//
// 'saved-unverified' is the honest success: the account is RECORDED in the
// native encrypted store, and nothing has established that the mailbox is
// reachable. It is the centre's CONFIGURED_UNVERIFIED, never « connecté ».
// 'saved-not-reread' is the same accepted write whose list re-read failed: the
// account exists and must not be created again. 'unconfirmed' is an answer that
// could not be read at all, so it proves neither a save nor a failure.
// 'write-unknown' is a request whose answer never arrived or could not be
// read. It is NOT a refusal: the server may have applied the write, so the
// panel stops offering to send and offers only a re-read.
export type HermesMailboxSetupOutcome =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved-unverified'; connectedAccountId: string }
  | { kind: 'saved-not-reread'; connectedAccountId: string }
  | { kind: 'rereading'; connectedAccountId: string }
  | { kind: 'write-unknown'; reason: string | null; listReread: boolean }
  | { kind: 'refused'; reason: string | null }
  | { kind: 'unconfirmed' };

const readErrorMessage = (error: unknown): string | null =>
  error instanceof Error ? error.message : null;

type UseHermesMailboxSetupProps = {
  // Called once the account exists server side AND the accounts list has been
  // re-read, so the caller's select already contains the account it is handed.
  onConnected?: (connectedAccountId: string) => void;
};

export const useHermesMailboxSetup = ({
  onConnected,
}: UseHermesMailboxSetupProps = {}) => {
  const { i18n } = useLingui();
  const { enqueueToast } = useToast();
  const [outcome, setOutcome] = useState<HermesMailboxSetupOutcome>({
    kind: 'idle',
  });

  // The native creation schema, unchanged: address, port, host+password and
  // transport security are validated by the product's own rules, not ours.
  const connectionSchema = useMemo(
    () => getConnectionImapSmtpCalDavSchema(),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [i18n.locale],
  );

  const formMethods = useForm<ConnectionFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(connectionSchema),
    defaultValues: buildHermesMailboxFormDefaults(),
  });

  const { handleSubmit, formState, watch, reset } = formMethods;
  const { isSubmitting } = formState;

  // The write and the re-read are awaited SEPARATELY on purpose. Bundling the
  // re-read into the mutation makes a failed re-read reject the save, and the
  // accepted write then reads as a refusal — which would push the operator into
  // creating the account a second time.
  const [saveConnection, { loading: saveLoading }] = useMutation(
    SaveImapSmtpCaldavAccountDocument,
  );

  const apolloClient = useApolloClient();

  // Re-reads the list the centre selects from, writing it to the cache the
  // centre's own query watches. It throws, and the caller decides what a
  // failure means for an account that already exists.
  const readAccountsList = useCallback(
    () =>
      apolloClient.query({
        query: GET_MY_CONNECTED_ACCOUNTS,
        fetchPolicy: 'network-only',
      }),
    [apolloClient],
  );

  const watchedValues = watch();

  const getConfiguredProtocols = useCallback(
    (
      values: ConnectionFormData,
    ): (keyof ImapSmtpCaldavAccountInput)[] =>
      ACCOUNT_TYPES.filter((protocol) => {
        const protocolConfig = values[protocol];
        return isDefined(protocolConfig) && isProtocolConfigured(protocolConfig);
      }),
    [],
  );

  const canSave = useMemo(
    () =>
      Boolean(watchedValues.handle?.trim()) &&
      getConfiguredProtocols(watchedValues).length > 0 &&
      !isSubmitting,
    [getConfiguredProtocols, watchedValues, isSubmitting],
  );

  const handleSave = useCallback(
    async (formValues: ConnectionFormData): Promise<void> => {
      const configuredProtocols = getConfiguredProtocols(formValues);

      // Submitting nothing configured would create an account that can neither
      // receive nor send. The schema refuses it too; this keeps the request
      // from leaving at all.
      if (configuredProtocols.length === 0) {
        setOutcome({ kind: 'unconfirmed' });
        return;
      }

      const connectionParameters: Partial<
        Record<keyof ImapSmtpCaldavAccountInput, ConnectionParametersInput>
      > = {};

      configuredProtocols.forEach((protocol) => {
        const protocolConfig = formValues[protocol];
        if (isDefined(protocolConfig)) {
          const { password, ...withoutPassword } = protocolConfig;

          // A password is sent only when it was typed in this session, exactly
          // as the native path does. It is never read back and never defaulted.
          connectionParameters[protocol] = isNonEmptyString(password)
            ? { ...withoutPassword, password }
            : withoutPassword;
        }
      });

      setOutcome({ kind: 'saving' });

      // The mutation is awaited in a try of its OWN. Nothing after it shares
      // this catch, so no later failure can be mistaken for the server's
      // answer about the write.
      let result;

      try {
        const { data } = await saveConnection({
          variables: {
            handle: formValues.handle,
            connectionParameters: {
              ...connectionParameters,
              name: formValues.name,
            },
          },
        });

        result = data?.saveImapSmtpCaldavAccount;
      } catch (error) {
        enqueueToast(getToastOptionsFromError({ error }));

        // Only GraphQL errors mean the server SAW this write and declined it.
        // A lost, non-OK or unparsable response proves nothing: the write may
        // have been applied, so claiming a refusal would invite a duplicate.
        setOutcome(
          CombinedGraphQLErrors.is(error)
            ? { kind: 'refused', reason: readErrorMessage(error) }
            : {
                kind: 'write-unknown',
                reason: readErrorMessage(error),
                listReread: false,
              },
        );
        return;
      }

      if (result?.success === false) {
        setOutcome({ kind: 'refused', reason: null });
        return;
      }

      const connectedAccountId = result?.connectedAccountId;

      // A reply we cannot read an account id out of settles nothing: the
      // account may exist. Saying so beats inventing either outcome.
      if (!isNonEmptyString(connectedAccountId)) {
        setOutcome({ kind: 'unconfirmed' });
        return;
      }

      // The typed password leaves the browser's memory as soon as the server
      // has it. Nothing about this account is kept client side.
      reset(buildHermesMailboxFormDefaults());

      // From here the write is ACCEPTED. A failed re-read is reported as a
      // stale list, never as a refusal, and the account is never offered for
      // creation again.
      try {
        await readAccountsList();
        setOutcome({ kind: 'saved-unverified', connectedAccountId });
      } catch {
        setOutcome({ kind: 'saved-not-reread', connectedAccountId });
      }

      // Outside every try: a consumer that throws must not rewrite the
      // server's verdict on its own write. The failure is reported on its own
      // terms and the outcome above stands.
      try {
        onConnected?.(connectedAccountId);
      } catch (error) {
        enqueueToast(getToastOptionsFromError({ error }));
      }
    },
    [
      getConfiguredProtocols,
      saveConnection,
      readAccountsList,
      reset,
      onConnected,
      enqueueToast,
    ],
  );

  // The only recovery this panel offers, for an accepted write whose list
  // re-read failed AND for a write whose answer was lost. It re-reads and
  // never writes: re-emitting could create the very duplicate at issue.
  const retryAccountsRead = useCallback(async (): Promise<void> => {
    if (outcome.kind === 'write-unknown') {
      try {
        await readAccountsList();
        setOutcome({ ...outcome, listReread: true });
      } catch {
        setOutcome({ ...outcome, listReread: false });
      }
      return;
    }

    if (outcome.kind !== 'saved-not-reread') {
      return;
    }

    const pending = outcome.connectedAccountId;
    setOutcome({ kind: 'rereading', connectedAccountId: pending });

    try {
      await readAccountsList();
      setOutcome({ kind: 'saved-unverified', connectedAccountId: pending });
    } catch {
      setOutcome({ kind: 'saved-not-reread', connectedAccountId: pending });
    }
  }, [outcome, readAccountsList]);

  const resetSetup = useCallback(() => {
    reset(buildHermesMailboxFormDefaults());
    setOutcome({ kind: 'idle' });
  }, [reset]);

  return {
    formMethods,
    handleSubmit,
    handleSave,
    canSave,
    isSubmitting,
    loading: saveLoading,
    outcome,
    resetSetup,
    retryAccountsRead,
  };
};
