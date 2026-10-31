import { zodResolver } from '@hookform/resolvers/zod';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { type GraphQLFormattedError } from 'graphql';
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
// 'write-unknown' is a request whose answer never arrived, could not be read,
// or carried no code proving a refusal BEFORE the write. The server may have
// applied it, so the panel stops offering to send and offers only a re-read.
export type HermesMailboxSetupOutcome =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved-unverified'; connectedAccountId: string }
  | { kind: 'saved-not-reread'; connectedAccountId: string }
  | { kind: 'rereading'; connectedAccountId: string }
  | { kind: 'write-unknown'; reason: string | null; listReread: boolean }
  | { kind: 'refused'; reason: string | null }
  | { kind: 'not-sent'; missing: HermesMailboxMissingProtocol[] }
  | { kind: 'unconfirmed' };

// The protocols the MAIL connection requires, and which of them the form is
// still missing.
//
// This is the SERVER's requirement, made legible before the write rather than
// softened: reception polls IMAP, and the native message channel the campaign
// sender is resolved from is created only when the submission carries an IMAP
// block. An SMTP-only account is created and then cannot serve as the MAIL
// connection, which surfaces later as a missing native channel.
export type HermesMailboxMissingProtocol = 'IMAP' | 'SMTP';

export type HermesMailboxProtocolRequirement =
  | { kind: 'met' }
  | { kind: 'missing'; missing: HermesMailboxMissingProtocol[] };

const readErrorMessage = (error: unknown): string | null =>
  error instanceof Error ? error.message : null;

// The ONLY codes accepted as proof the write was REFUSED, because each is
// raised before the native resolver reaches its transaction: the guards and
// the validation pipe run before the method body, and the resolver's own
// pre-write throws carry these. Every other code — INTERNAL_SERVER_ERROR
// first of all — can follow the COMMIT, so it proves nothing.
const PRE_WRITE_REFUSAL_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_USER_INPUT',
  'NOT_FOUND',
];

// Read from the top-level extensions code ONLY: a subCode is a module's own
// label and does not say where the check ran, so it is not evidence here.
const isPreWriteRefusalCode = (
  graphQLError: GraphQLFormattedError,
): boolean => {
  const code = graphQLError.extensions?.code;

  return typeof code === 'string' && PRE_WRITE_REFUSAL_CODES.includes(code);
};

// A refusal has to be PROVEN, so every error in the answer must be placed on
// that list. One unplaceable or missing code leaves the outcome unknown: the
// server may have applied the write.
const isProvenPreWriteRefusal = (error: unknown): boolean =>
  CombinedGraphQLErrors.is(error) &&
  error.errors.length > 0 &&
  error.errors.every(isPreWriteRefusalCode);

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
    // The transport must never replay this one. ApolloFactory's RetryLink runs
    // with `max: 2` and retries on any network error, so without this a lost
    // answer could land the write TWICE before the outcome below is computed —
    // creating a second connected account that nothing here can delete.
    { context: { skipRetry: true } },
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

  const protocolRequirement = useMemo<HermesMailboxProtocolRequirement>(() => {
    const missing = (['IMAP', 'SMTP'] as const).filter((protocol) => {
      const protocolConfig = watchedValues[protocol];

      return !isDefined(protocolConfig) || !isProtocolConfigured(protocolConfig);
    });

    return missing.length === 0 ? { kind: 'met' } : { kind: 'missing', missing };
  }, [watchedValues]);

  const canSave = useMemo(
    () =>
      Boolean(watchedValues.handle?.trim()) &&
      getConfiguredProtocols(watchedValues).length > 0 &&
      // Both protocols, because the server requires both of a MAIL connection.
      protocolRequirement.kind === 'met' &&
      !isSubmitting,
    [getConfiguredProtocols, watchedValues, protocolRequirement, isSubmitting],
  );

  const handleSave = useCallback(
    async (formValues: ConnectionFormData): Promise<void> => {
      // Checked again on the submitted values, not on the watched ones: the
      // button is the first guard, and a request that cannot serve its purpose
      // must not leave even if something else triggers the submit.
      const missingProtocols = (['IMAP', 'SMTP'] as const).filter(
        (protocol) => {
          const protocolConfig = formValues[protocol];

          return (
            !isDefined(protocolConfig) || !isProtocolConfigured(protocolConfig)
          );
        },
      );

      if (missingProtocols.length > 0) {
        setOutcome({ kind: 'not-sent', missing: [...missingProtocols] });

        return;
      }

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

        // A GraphQL error is NOT proof of a refusal: the native resolver
        // COMMITS, then awaits more work, so an INTERNAL_SERVER_ERROR can
        // follow an applied write. Only a code raised before the write reads
        // as refused; every other answer, and every lost one, stays unknown
        // and is offered no re-emission.
        setOutcome(
          isProvenPreWriteRefusal(error)
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
    protocolRequirement,
    resetSetup,
    retryAccountsRead,
  };
};
