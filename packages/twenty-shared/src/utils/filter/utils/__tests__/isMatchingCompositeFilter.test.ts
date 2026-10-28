import { FieldMetadataType } from '@/types';
import { COMPOSITE_FIELD_SUB_FIELD_MATCHERS_MAP } from '@/utils/filter/utils/compositeFieldSubFieldMatchersMap';
import { isMatchingCompositeFilter } from '@/utils/filter/utils/isMatchingCompositeFilter';

const LINKS_MATCHERS =
  COMPOSITE_FIELD_SUB_FIELD_MATCHERS_MAP[FieldMetadataType.LINKS] ?? {};

const isMatchingLinksFilter = ({
  compositeFilter,
  compositeValue,
}: {
  compositeFilter: Record<string, object | undefined>;
  compositeValue: Record<string, unknown> | null;
}) =>
  isMatchingCompositeFilter({
    compositeFilter,
    compositeValue,
    subFieldMatchers: LINKS_MATCHERS,
  });

const LINKS_VALUE = {
  primaryLinkUrl: 'https://kovaa-lab.com',
  primaryLinkLabel: 'KovaaLab CRM',
  secondaryLinks: [{ url: 'https://docs.kovaa-lab.com', label: 'Docs' }],
};

describe('isMatchingCompositeFilter', () => {
  it('matches when every sub-filter matches', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: {
          primaryLinkUrl: { ilike: '%kovaa-lab%' },
          primaryLinkLabel: { eq: 'KovaaLab CRM' },
        },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(true);
  });

  it('does not match when one sub-filter fails', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: {
          primaryLinkUrl: { ilike: '%kovaa-lab%' },
          primaryLinkLabel: { eq: 'Other' },
        },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(false);
  });

  it('ignores absent and empty sub-filters', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { primaryLinkUrl: {}, primaryLinkLabel: undefined },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(true);
  });

  it('does not match a sub-field without a matcher', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { unknownSubField: { eq: 'KovaaLab CRM' } },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(false);
  });

  it('matches a missing value only with IS NULL', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { primaryLinkLabel: { is: 'NULL' } },
        compositeValue: null,
      }),
    ).toBe(true);

    expect(
      isMatchingLinksFilter({
        compositeFilter: { primaryLinkLabel: { eq: 'KovaaLab CRM' } },
        compositeValue: { primaryLinkLabel: null },
      }),
    ).toBe(false);
  });

  it('matches secondary links through their JSON content', () => {
    expect(
      isMatchingLinksFilter({
        compositeFilter: { secondaryLinks: { like: '%docs.kovaa-lab.com%' } },
        compositeValue: LINKS_VALUE,
      }),
    ).toBe(true);
  });
});
