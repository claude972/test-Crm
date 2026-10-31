import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';

export const LEGACY_GLOBAL_EMAILING_DRIVER = 'LEGACY_GLOBAL' as const;
export const EMAILING_DOMAIN_PROVENANCE_VALUES = [
  LEGACY_GLOBAL_EMAILING_DRIVER,
  ...Object.values(EmailingDomainDriver),
];
export type EmailingDomainDriverProvenance =
  | EmailingDomainDriver
  | typeof LEGACY_GLOBAL_EMAILING_DRIVER;
