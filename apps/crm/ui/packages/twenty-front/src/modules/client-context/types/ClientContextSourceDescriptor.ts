import { type IconComponent } from 'kovaa-lab-ui/icon';

import { type ClientContextEntryKind } from '@/client-context/types/ClientContextEntry';

// The identity of one source of record context.
//
// `name` is a plain string and not a lingui message: Forms and Cal.diy are the
// names of two separate applications, and a product name is not translated.
// Everything a reader has to understand around it is translated.
export type ClientContextSourceDescriptor = {
  kind: ClientContextEntryKind;
  name: string;
  Icon: IconComponent;
};
