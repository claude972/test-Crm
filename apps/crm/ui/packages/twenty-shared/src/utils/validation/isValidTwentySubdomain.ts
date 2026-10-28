import { SUBDOMAIN_PATTERN } from '@/constants/SubdomainPattern';

export const isValidKovaaLab CRMSubdomain = (subdomain: string): boolean => {
  return SUBDOMAIN_PATTERN.test(subdomain);
};
