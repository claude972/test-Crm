import { useLocation, useNavigate } from 'react-router-dom';

export const useResetLocationHash = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // oxlint-disable-next-line kovaa-lab/no-navigate-prefer-link
  const resetLocationHash = () => {
    navigate(location.pathname, { replace: true });
  };

  return { resetLocationHash };
};
