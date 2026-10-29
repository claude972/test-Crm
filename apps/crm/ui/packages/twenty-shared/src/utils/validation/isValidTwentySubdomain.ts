import { SUBDOMAIN_PATTERN } from '@/constants/SubdomainPattern';

export const isValidKovaaLabCRMSubdomain = (subdomain: string): boolean => {
  return SUBDOMAIN_PATTERN.test(subdomain);
};
