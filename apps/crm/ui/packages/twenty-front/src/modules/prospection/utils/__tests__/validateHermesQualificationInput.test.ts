import {
  validateHermesCampaignDraftInput,
  validateHermesQualificationInput,
} from '@/prospection/utils/validateHermesQualificationInput';

const VALID = {
  batchId: 'batch-1',
  rowIds: ['row-1'],
  professionalPurpose: 'Contacting trade show visitors about our service.',
  privacyNoticeUrl: 'https://example.com/privacy',
  informationMethod: 'first-contact-notice' as const,
};

const codesOf = (issues: { code: string }[]) => issues.map((issue) => issue.code);

describe('validateHermesQualificationInput', () => {
  it('accepts a complete answer', () => {
    const { input, issues } = validateHermesQualificationInput(VALID);

    expect(issues).toEqual([]);
    expect(input).toEqual({
      batchId: 'batch-1',
      rowIds: ['row-1'],
      professionalPurpose: VALID.professionalPurpose,
      privacyNoticeUrl: 'https://example.com/privacy',
      informationMethod: 'first-contact-notice',
    });
  });

  // The defect this replaces: the form preselected 'already-informed', so the
  // default answer asserted that these people had already been told.
  it('refuses an unanswered information method instead of choosing one', () => {
    const { input, issues } = validateHermesQualificationInput({
      ...VALID,
      informationMethod: null,
    });

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('information-method-required');
  });

  it('refuses a notice URL that is not HTTPS', () => {
    const { issues } = validateHermesQualificationInput({
      ...VALID,
      privacyNoticeUrl: 'http://example.com/privacy',
    });

    expect(codesOf(issues)).toContain('privacy-notice-not-https');
  });

  // Valid HTTPS, and still refused: a secret in a URL shown to recipients
  // would leak.
  it('refuses a notice URL carrying credentials', () => {
    const { input, issues } = validateHermesQualificationInput({
      ...VALID,
      privacyNoticeUrl: 'https://user:pass@example.com/privacy',
    });

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('privacy-notice-has-credentials');
  });

  it('collapses duplicate row ids before counting them, as the contract counts unique ids', () => {
    const { input } = validateHermesQualificationInput({
      ...VALID,
      rowIds: ['row-1', 'row-1', 'row-2'],
    });

    expect(input?.rowIds).toEqual(['row-1', 'row-2']);
  });

  it('refuses a purpose shorter than the contract allows', () => {
    const { issues } = validateHermesQualificationInput({
      ...VALID,
      professionalPurpose: 'short',
    });

    expect(codesOf(issues)).toContain('purpose-too-short');
  });

  it('refuses a purpose longer than the contract allows', () => {
    const { issues } = validateHermesQualificationInput({
      ...VALID,
      professionalPurpose: 'a'.repeat(1001),
    });

    expect(codesOf(issues)).toContain('purpose-too-long');
  });

  it('refuses more unique rows than the contract accepts', () => {
    const { issues } = validateHermesQualificationInput({
      ...VALID,
      rowIds: Array.from({ length: 101 }, (_, index) => `row-${index}`),
    });

    expect(codesOf(issues)).toContain('too-many-rows-selected');
  });
});

describe('validateHermesCampaignDraftInput', () => {
  const VALID_DRAFT = {
    name: 'October outreach',
    subject: 'A question about your logistics',
    rowIds: ['row-1'],
  };

  it('accepts a complete draft', () => {
    const { input, issues } = validateHermesCampaignDraftInput(VALID_DRAFT);

    expect(issues).toEqual([]);
    expect(input).toEqual(VALID_DRAFT);
  });

  it('accepts a name at the server bound', () => {
    const { issues } = validateHermesCampaignDraftInput({
      ...VALID_DRAFT,
      name: 'a'.repeat(200),
    });

    expect(issues).toEqual([]);
  });

  // The defect this replaces: the 201st character passed here and was refused
  // by the server.
  it('refuses a name one character past the server bound', () => {
    const { input, issues } = validateHermesCampaignDraftInput({
      ...VALID_DRAFT,
      name: 'a'.repeat(201),
    });

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('draft-name-too-long');
  });

  it('accepts a subject at the server bound', () => {
    const { issues } = validateHermesCampaignDraftInput({
      ...VALID_DRAFT,
      subject: 'a'.repeat(200),
    });

    expect(issues).toEqual([]);
  });

  // Missed when the name was bounded, and found by the same review.
  it('refuses a subject one character past the server bound', () => {
    const { input, issues } = validateHermesCampaignDraftInput({
      ...VALID_DRAFT,
      subject: 'a'.repeat(201),
    });

    expect(input).toBeNull();
    expect(codesOf(issues)).toContain('draft-subject-too-long');
  });

  it('refuses a draft with no qualified row', () => {
    const { issues } = validateHermesCampaignDraftInput({
      ...VALID_DRAFT,
      rowIds: [],
    });

    expect(codesOf(issues)).toContain('no-qualified-row-selected');
  });
});
