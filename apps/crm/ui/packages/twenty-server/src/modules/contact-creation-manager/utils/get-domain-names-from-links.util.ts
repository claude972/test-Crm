import { isNonEmptyString } from '@sniptt/guards';
import { type LinkMetadata, type LinksMetadata } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { parseArrayOrJsonStringToArray } from 'src/engine/api/graphql/graphql-query-runner/utils/parse-additional-items.util';

export const getDomainNamesFromLinks = (
  domainName: LinksMetadata | null | undefined,
): string[] => {
  if (!isDefined(domainName)) {
    return [];
  }

  return [
    domainName.primaryLinkUrl,
    ...parseArrayOrJsonStringToArray<LinkMetadata>(
      domainName.secondaryLinks,
    ).map((link) => link.url),
  ].filter(isNonEmptyString);
};
