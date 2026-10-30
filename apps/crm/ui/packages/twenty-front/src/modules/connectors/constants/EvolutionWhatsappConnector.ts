import { msg } from '@lingui/core/macro';
import { IconBrandWhatsapp } from 'kovaa-lab-ui/icon';

import { type ConnectorDescriptor } from '@/connectors/types/ConnectorDescriptor';

export const EVOLUTION_WHATSAPP_CONNECTOR_ID = 'evolution-whatsapp';

export const EVOLUTION_WHATSAPP_CONNECTOR: ConnectorDescriptor = {
  id: EVOLUTION_WHATSAPP_CONNECTOR_ID,
  name: msg`WhatsApp`,
  channel: msg`Messaging`,
  Icon: IconBrandWhatsapp,
};
