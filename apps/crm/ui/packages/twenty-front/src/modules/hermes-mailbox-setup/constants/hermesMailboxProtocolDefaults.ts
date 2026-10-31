import {
  type ConnectionParametersInput,
  EmailConnectionSecurity,
} from '~/generated-metadata/graphql';

import { type ConnectionFormData } from '@/settings/accounts/hooks/useImapSmtpCaldavConnectionForm';

// The protocol defaults the native account form opens with.
//
// Extracted from the native page's hook, which keeps them private, so the
// centre opens on the SAME ports and the SAME transport security rather than
// a second set that could drift. Changing a value here changes what the
// operator is offered; it does not relax validation, which the native zod
// schema owns.
export const HERMES_MAILBOX_PROTOCOL_DEFAULTS: Record<
  'IMAP' | 'SMTP' | 'CALDAV',
  ConnectionParametersInput
> = {
  IMAP: {
    host: '',
    port: 993,
    password: '',
    connectionSecurity: EmailConnectionSecurity.SSL_TLS,
  },
  SMTP: {
    host: '',
    username: '',
    port: 587,
    password: '',
    connectionSecurity: EmailConnectionSecurity.STARTTLS,
  },
  CALDAV: {
    host: '',
    port: 443,
    password: '',
    connectionSecurity: EmailConnectionSecurity.SSL_TLS,
  },
};

// An empty mailbox form. A fresh object every call: react-hook-form mutates
// the defaults it is handed, and a shared literal would carry one operator's
// typing into the next company's form.
export const buildHermesMailboxFormDefaults = (): ConnectionFormData => ({
  name: '',
  handle: '',
  IMAP: { ...HERMES_MAILBOX_PROTOCOL_DEFAULTS.IMAP },
  SMTP: { ...HERMES_MAILBOX_PROTOCOL_DEFAULTS.SMTP },
  CALDAV: { ...HERMES_MAILBOX_PROTOCOL_DEFAULTS.CALDAV },
});
