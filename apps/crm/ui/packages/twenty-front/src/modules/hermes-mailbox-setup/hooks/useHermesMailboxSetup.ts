import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
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
// 'saved-unverified' is the honest success: the credentials are in the native
// encrypted store and NOTHING has contacted the server they describe. It is
// the centre's CONFIGURED_UNVERIFIED, never « connecté ». 'unconfirmed' is an
// answer that could not be read: it proves neither a save nor a failure, so a
// retry could duplicate and is not offered as a success.
export type HermesMailboxSetupOutcome =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved-unverified'; connectedAccountId: string }
  | { kind: 'refused'; reason: string | null }
  | { kind: 'unconfirmed' };

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

  const [saveConnection, { loading: saveLoading }] = useMutation(
    SaveImapSmtpCaldavAccountDocument,
    {
      // The centre reads its selectable accounts from this query. Awaiting the
      // re-read is what makes the new account present before it is announced.
      refetchQueries: [{ query: GET_MY_CONNECTED_ACCOUNTS }],
      awaitRefetchQueries: true,
    },
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

        const result = data?.saveImapSmtpCaldavAccount;

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
        setOutcome({ kind: 'saved-unverified', connectedAccountId });
        onConnected?.(connectedAccountId);
      } catch (error) {
        const toastOptions = getToastOptionsFromError({ error });
        enqueueToast(toastOptions);
        setOutcome({
          kind: 'refused',
          reason: error instanceof Error ? error.message : null,
        });
      }
    },
    [
      getConfiguredProtocols,
      saveConnection,
      reset,
      onConnected,
      enqueueToast,
    ],
  );

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
  };
};
