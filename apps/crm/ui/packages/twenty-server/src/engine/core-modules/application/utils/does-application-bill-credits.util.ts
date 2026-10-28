import { type ApplicationBilling } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

export const doesApplicationBillCredits = (
  billing: ApplicationBilling | undefined,
): boolean =>
  Object.values(billing?.operations ?? {}).some(isDefined) ||
  Object.values(billing?.recurring ?? {}).some(isDefined);
