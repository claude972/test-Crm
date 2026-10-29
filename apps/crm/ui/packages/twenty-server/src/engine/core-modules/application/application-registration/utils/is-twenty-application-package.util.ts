import { isNonEmptyString } from '@sniptt/guards';

const KOVAALAB_APPLICATION_PACKAGE_SCOPE = '@kovaa-lab/';

export const isKovaaLabCRMApplicationPackage = (
  sourcePackage: string | null | undefined,
): boolean =>
  isNonEmptyString(sourcePackage) &&
  sourcePackage.startsWith(KOVAALAB_APPLICATION_PACKAGE_SCOPE);
