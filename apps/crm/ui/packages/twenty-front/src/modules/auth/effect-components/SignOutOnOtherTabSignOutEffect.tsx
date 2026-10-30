import { useAuth } from '@/auth/hooks/useAuth';
import { subscribeToSignOutFromOtherTabs } from '@/auth/utils/crossTabSignOut';
import { useEffect } from 'react';

export const SignOutOnOtherTabSignOutEffect = () => {
  const { clearSession } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToSignOutFromOtherTabs(() => {
      // Fire-and-forget on purpose: this effect reacts to another tab, and
      // clearSession now awaits its own purge before navigating.
      void clearSession();
    });

    return unsubscribe;
  }, [clearSession]);

  return null;
};
