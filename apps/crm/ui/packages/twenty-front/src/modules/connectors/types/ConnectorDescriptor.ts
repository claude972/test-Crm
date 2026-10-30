import { type MessageDescriptor } from '@lingui/core';
import { type IconComponent } from 'kovaa-lab-ui/icon';

// The product-facing identity of a connector. Held as message descriptors so
// the catalogue can live at module scope and still follow the active locale.
export type ConnectorDescriptor = {
  id: string;
  name: MessageDescriptor;
  // The business line it serves, not the transport it uses.
  channel: MessageDescriptor;
  Icon: IconComponent;
};
