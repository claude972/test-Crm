import { RESERVED_SUBDOMAINS } from 'kovaa-lab-shared/constants';
import { isValidKovaaLabCRMSubdomain } from 'kovaa-lab-shared/utils';

export const isSubdomainValid = (subdomain: string) => {
  return (
    isValidKovaaLabCRMSubdomain(subdomain) &&
    !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())
  );
};
