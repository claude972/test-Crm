import { RESERVED_SUBDOMAINS } from 'kovaa-lab-shared/constants';
import { isValidKovaaLab CRMSubdomain } from 'kovaa-lab-shared/utils';

export const isSubdomainValid = (subdomain: string) => {
  return (
    isValidKovaaLab CRMSubdomain(subdomain) &&
    !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())
  );
};
