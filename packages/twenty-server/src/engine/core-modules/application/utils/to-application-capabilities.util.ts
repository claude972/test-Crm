import {
  type ApplicationCapability,
  isApplicationCapability,
} from 'kovaa-lab-shared/application';

export const toApplicationCapabilities = (
  capabilities: unknown,
): ApplicationCapability[] => {
  if (!Array.isArray(capabilities)) {
    return [];
  }

  return capabilities.filter(isApplicationCapability);
};
