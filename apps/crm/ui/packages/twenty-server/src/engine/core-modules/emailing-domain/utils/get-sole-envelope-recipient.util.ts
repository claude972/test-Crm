import { parseEmailAddressList } from 'kovaa-lab-shared/utils';
import { z } from 'zod';

import { type EmailingDomainEmailContent } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-email-content.type';

type GetSoleEnvelopeRecipientArgs = Pick<
  EmailingDomainEmailContent,
  'to' | 'cc' | 'bcc'
>;

export const getSoleEnvelopeRecipient = ({
  to,
  cc,
  bcc,
}: GetSoleEnvelopeRecipientArgs): string | null => {
  const recipients = [...to, ...(cc ?? []), ...(bcc ?? [])];

  if (recipients.length !== 1 || /[\r\n]/.test(recipients[0])) return null;
  const parsed = parseEmailAddressList(recipients[0]);

  if (parsed.length !== 1) return null;
  const address = parsed[0].address.trim().toLowerCase();

  // Tokens identify the bare address used by suppression lookups; display
  // names remain unchanged on the actual email envelope/header input.
  return z.string().email().safeParse(address).success ? address : null;
};
