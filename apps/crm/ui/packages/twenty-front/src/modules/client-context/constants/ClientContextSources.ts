import { IconCalendarEvent, IconForms } from 'kovaa-lab-ui/icon';

import { type ClientContextSourceDescriptor } from '@/client-context/types/ClientContextSourceDescriptor';

// The two applications a client record draws context from. They are separate
// applications with their own sessions, and the integration contract is
// explicit that opening one is navigation rather than an integration — so
// these descriptors carry no URL and nothing here links anywhere.
export const CLIENT_CONTEXT_FORMS_SOURCE: ClientContextSourceDescriptor = {
  kind: 'form-response',
  name: 'Forms',
  Icon: IconForms,
};

export const CLIENT_CONTEXT_BOOKINGS_SOURCE: ClientContextSourceDescriptor = {
  kind: 'booking',
  name: 'Cal.diy',
  Icon: IconCalendarEvent,
};
