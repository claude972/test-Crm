import { useLingui } from '@lingui/react/macro';
import { IconBrandWhatsapp } from 'kovaa-lab-ui/icon';

import { HermesWaInboxRuntime } from '@/hermes-wa-runtime/components/HermesWaInboxRuntime';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

export const HermesWaRuntimePage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={
        <PageCardHeader icon={<IconBrandWhatsapp />} title={t`WhatsApp`} />
      }
    >
      <nav
        aria-label="Connexion et contrôle WhatsApp"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16 }}
      >
        <a href="/hermes/connexions#hermes-whatsapp">
          Connecter WhatsApp par QR code
        </a>
        <a href="/hermes/connexions#hermes-bot">Activer / désactiver le bot</a>
        <a href="/hermes/connexions#hermes-mcp">Connexion MCP et clé du bot</a>
      </nav>
      <HermesWaInboxRuntime />
    </PageCardLayout>
  );
};
