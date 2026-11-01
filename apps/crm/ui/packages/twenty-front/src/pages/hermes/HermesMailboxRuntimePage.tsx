import { useNavigate } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { IconMail } from 'kovaa-lab-ui/icon';

import { HermesMailboxRuntime } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntime';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

export const HermesMailboxRuntimePage = () => {
  const { t } = useLingui();
  const navigate = useNavigate();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconMail />} title={t`Mailbox`} />}
    >
      <nav
        aria-label="Connexion mail et contrôle du bot"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16 }}
      >
        <a href="/hermes/connexions#hermes-mail">Connecter une boîte mail</a>
        <a href="/hermes/connexions#hermes-bot">Activer / désactiver le bot</a>
      </nav>
      <HermesMailboxRuntime
        onConnectProvider={() => navigate('/hermes/connexions#hermes-mail')}
      />
    </PageCardLayout>
  );
};
