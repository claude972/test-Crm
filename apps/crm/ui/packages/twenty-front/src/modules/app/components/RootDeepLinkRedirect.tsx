import { Navigate, useLocation } from 'react-router-dom';
import { AppPath } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { isValidReturnToPath } from '@/auth/utils/isValidReturnToPath';

export const RootDeepLinkRedirect = () => {
  const { hash, pathname, search } = useLocation();

  const searchParams = new URLSearchParams(search);
  const returnToPathFromSearchParams = searchParams.get('returnToPath');

  const returnToPath = isDefined(returnToPathFromSearchParams)
    ? returnToPathFromSearchParams
    : `${pathname}${search}${hash}`;

  if (isValidReturnToPath(returnToPath)) {
    searchParams.set('returnToPath', returnToPath);
  } else {
    searchParams.delete('returnToPath');
  }

  return (
    <Navigate
      to={{
        pathname: AppPath.SignInUp,
        search: searchParams.toString(),
      }}
      replace
    />
  );
};
