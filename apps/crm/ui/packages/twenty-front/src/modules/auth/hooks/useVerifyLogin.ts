import { getSessionGeneration } from '@/auth/utils/getSessionGeneration';
import { isSameOriginMultiWorkspaceEnabledState } from '@/client-config/states/isSameOriginMultiWorkspaceEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';
import { isAppEffectRedirectEnabledState } from '@/auth/states/isAppEffectRedirectEnabledState';
import { useAuth } from '@/auth/hooks/useAuth';
import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useLingui } from '@lingui/react/macro';
import { AppPath } from 'kovaa-lab-shared/types';
import { useToast } from 'kovaa-lab-ui/components/feedback';
import { useNavigateApp } from '~/hooks/useNavigateApp';

export const useVerifyLogin = () => {
  const isSameOriginMultiWorkspaceEnabled = useAtomStateValue(
    isSameOriginMultiWorkspaceEnabledState,
  );
  const { enqueueToast } = useToast();
  const navigate = useNavigateApp();
  const setIsAppEffectRedirectEnabled = useSetAtomState(
    isAppEffectRedirectEnabledState,
  );
  const { getAuthTokensFromLoginToken } = useAuth();
  const { t } = useLingui();

  const verifyLoginToken = async (loginToken: string) => {
    const requestSessionGeneration = getSessionGeneration();
    // Keeps PageChangeEffect from consuming returnToPath mid token swap
    setIsAppEffectRedirectEnabled(false);
    try {
      await getAuthTokensFromLoginToken(loginToken);
    } catch (error) {
      enqueueToast(
        CombinedGraphQLErrors.is(error)
          ? getToastOptionsFromError({ error })
          : { status: 'error', children: t`Authentication failed` },
      );
      if (!isGraphqlErrorOfType(error, 'SESSION_SUPERSEDED'))
        navigate(AppPath.SignInUp);
    } finally {
      if (
        !isSameOriginMultiWorkspaceEnabled ||
        requestSessionGeneration === getSessionGeneration()
      )
        setIsAppEffectRedirectEnabled(true);
    }
  };

  return { verifyLoginToken };
};
