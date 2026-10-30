import { assertAuthSessionUnchanged } from '@/auth/utils/assertAuthSessionUnchanged';
import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { GET_AUTH_TOKENS_FROM_SSO_EXCHANGE_TOKEN_WITH_WORKSPACE } from '@/auth/graphql/mutations/getAuthTokensFromSsoExchangeToken';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isAppEffectRedirectEnabledState } from '@/auth/states/isAppEffectRedirectEnabledState';
import { useMarkSessionActive } from '@/auth/hooks/useMarkSessionActive';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useMutation } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { useCallback } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
import { useToast } from 'kovaa-lab-ui/components/feedback';
import { GetAuthTokensFromSsoExchangeTokenDocument } from '~/generated-metadata/graphql';
import { logError } from '~/utils/logError';

type SsoExchangeResult = {
  getAuthTokensFromSSOExchangeToken: {
    tokens: {
      accessOrWorkspaceAgnosticToken: { token: string };
      refreshToken: { token: string };
    };
    workspaceLoginToken?: { token: string } | null;
  };
};

export const useRedeemSsoExchangeToken = ({
  redeemWorkspaceLoginToken,
}: {
  redeemWorkspaceLoginToken?: (loginToken: string) => Promise<void>;
} = {}) => {
  const isSameOriginMultiWorkspaceEnabled = useAtomStateValue(
    isSameOriginMultiWorkspaceEnabledState,
  );
  const { enqueueToast } = useToast();
  const markSessionActive = useMarkSessionActive();
  const setIsAppEffectRedirectEnabled = useSetAtomState(
    isAppEffectRedirectEnabledState,
  );
  const [getAuthTokensFromSsoExchangeToken] = useMutation<
    SsoExchangeResult,
    { ssoExchangeToken: string }
  >(
    isSameOriginMultiWorkspaceEnabled
      ? GET_AUTH_TOKENS_FROM_SSO_EXCHANGE_TOKEN_WITH_WORKSPACE
      : GetAuthTokensFromSsoExchangeTokenDocument,
  );

  const redeemSsoExchangeToken = useCallback(
    async (ssoExchangeToken: string) => {
      // Keeps PageChangeEffect from consuming returnToPath while the server swaps the session cookie
      setIsAppEffectRedirectEnabled(false);

      const requestSessionGeneration = getSessionGeneration();
      try {
        const { data, error } = await getAuthTokensFromSsoExchangeToken({
          variables: { ssoExchangeToken },
        });

        if (isDefined(error)) throw error;
        if (!isDefined(data?.getAuthTokensFromSSOExchangeToken)) {
          throw new Error(
            doNotTranslate('No getAuthTokensFromSSOExchangeToken result'),
          );
        }

        if (isSameOriginMultiWorkspaceEnabled)
          assertAuthSessionUnchanged(requestSessionGeneration);
        const workspaceLoginToken =
          data.getAuthTokensFromSSOExchangeToken.workspaceLoginToken;
        if (isDefined(workspaceLoginToken)) {
          if (!redeemWorkspaceLoginToken || !workspaceLoginToken.token)
            throw new Error(
              doNotTranslate(
                'Workspace authentication redemption is unavailable',
              ),
            );
          await redeemWorkspaceLoginToken(workspaceLoginToken.token);
          return;
        }
        markSessionActive();
      } catch (error: unknown) {
        logError(error);
        enqueueToast({ status: 'error', children: t`Authentication failed` });
      } finally {
        setIsAppEffectRedirectEnabled(true);
      }
    },
    [
      getAuthTokensFromSsoExchangeToken,
      isSameOriginMultiWorkspaceEnabled,
      redeemWorkspaceLoginToken,
      markSessionActive,
      setIsAppEffectRedirectEnabled,
      enqueueToast,
    ],
  );

  return { redeemSsoExchangeToken };
};
