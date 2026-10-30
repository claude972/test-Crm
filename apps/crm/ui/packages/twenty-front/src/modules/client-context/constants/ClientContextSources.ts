import { IconCalendarEvent, IconFileText, IconForms } from 'kovaa-lab-ui/icon';

import { type ClientContextSourceDescriptor } from '@/client-context/types/ClientContextSourceDescriptor';

// The three streams a client record draws context from. None of these
// descriptors carries a URL and nothing in this module links anywhere: the
// integration contract is explicit that opening another application is
// navigation rather than an integration.
//
// 'Forms' is the project's own name for the application under apps/crm/form —
// package kovaa-lab-forms, authored by EarlyBird, Inc. It is NOT Formbricks,
// and nothing here assumes that lineage. The application is not renamed by
// this module; the label below is the surface name only, and each item's real
// origin is read from its own provenance.
export const CLIENT_CONTEXT_FORMS_SOURCE: ClientContextSourceDescriptor = {
  kind: 'form-response',
  name: 'Forms',
  Icon: IconForms,
};

// Appointments arrive through the native CalendarEvent object, so the surface
// is named after the stream rather than after one booking application: the
// originating application is whatever each item's provenance says it is.
export const CLIENT_CONTEXT_BOOKINGS_SOURCE: ClientContextSourceDescriptor = {
  kind: 'booking',
  name: 'Calendar',
  Icon: IconCalendarEvent,
};

// Recorded Hermes actions arrive through the native Note object, same reasoning.
export const CLIENT_CONTEXT_NOTES_SOURCE: ClientContextSourceDescriptor = {
  kind: 'note',
  name: 'Notes',
  Icon: IconFileText,
};
