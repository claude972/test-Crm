import { emailSchema } from 'kovaa-lab-shared/utils';

export const isValidEmailRecipientAddress = (address: string): boolean =>
  emailSchema.safeParse(address).success;
