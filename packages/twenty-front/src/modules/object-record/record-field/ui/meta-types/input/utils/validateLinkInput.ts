import { absoluteUrlSchema, isValidDomain } from 'kovaa-lab-shared/utils';

export const validateLinkInput = ({
  input,
  isDomainField,
}: {
  input: string;
  isDomainField: boolean;
}) => ({
  isValid: isDomainField
    ? isValidDomain(input)
    : absoluteUrlSchema.safeParse(input).success,
  errorMessage: '',
});
