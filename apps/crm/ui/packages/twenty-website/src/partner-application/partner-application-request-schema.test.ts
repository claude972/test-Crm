import { partnerApplicationRequestSchema } from './partner-application-request-schema';

const validExperienceNotes =
  'Built a custom KovaaLab CRM app for a property-management client, modeled leases and ' +
  'tenants as data models, automated renewal workflows, and shipped a front component ' +
  'for the broker dashboard with role-based views.';

const minimalValid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines Ltd',
  website: 'https://analyticalengines.example',
  city: 'London',
  hourlyRate: 150,
  projectBudgetMin: 5000,
  kovaa-labExperience: ['WORKFLOWS'],
  kovaa-labExperienceNotes: validExperienceNotes,
  kovaa-labExperienceProofLink: 'https://www.loom.com/share/example',
};

const fullValid = {
  ...minimalValid,
  linkedin: 'https://www.linkedin.com/in/ada',
  country: 'UNITED_KINGDOM',
  languages: ['ENGLISH', 'FRENCH'],
  typeOfTeam: 'SOLO',
  partnerScope: ['ADVISORY', 'SOLUTIONING'],
  skills: ['React', 'TypeScript'],
  calendarLink: 'https://cal.com/ada',
};

describe('partnerApplicationRequestSchema', () => {
  it('accepts the minimal required payload', () => {
    expect(
      partnerApplicationRequestSchema.safeParse(minimalValid).success,
    ).toBe(true);
  });

  it('accepts the full payload', () => {
    expect(partnerApplicationRequestSchema.safeParse(fullValid).success).toBe(
      true,
    );
  });

  it('rejects an unknown country enum value', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        country: 'ATLANTIS',
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown scope enum value', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        partnerScope: ['NOPE'],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown top-level keys (strictObject)', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        countryOther: 'Republic of Examples',
      }).success,
    ).toBe(false);
  });

  it('rejects legacy applicationNotes', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        applicationNotes: 'Workspace URL and refs',
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        email: 'not-an-email',
      }).success,
    ).toBe(false);
  });

  it('rejects a missing required field', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({ email: 'ada@example.com' })
        .success,
    ).toBe(false);
  });

  it('rejects when a newly-required field is missing', () => {
    for (const field of [
      'website',
      'city',
      'hourlyRate',
      'projectBudgetMin',
      'kovaa-labExperience',
      'kovaa-labExperienceNotes',
      'kovaa-labExperienceProofLink',
    ]) {
      const withoutField = Object.fromEntries(
        Object.entries(minimalValid).filter(([key]) => key !== field),
      );
      expect(
        partnerApplicationRequestSchema.safeParse(withoutField).success,
      ).toBe(false);
    }
  });

  it('rejects empty kovaa-labExperience', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        kovaa-labExperience: [],
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown kovaa-labExperience milestone', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        kovaa-labExperience: ['INTEGRATIONS'],
      }).success,
    ).toBe(false);
  });

  it('rejects kovaa-labExperienceNotes shorter than 200 characters', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        kovaa-labExperienceNotes: 'Too short for a real implementation narrative.',
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid kovaa-labExperienceProofLink', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        kovaa-labExperienceProofLink: 'not-a-url',
      }).success,
    ).toBe(false);
  });

  it('rejects a negative hourly rate', () => {
    expect(
      partnerApplicationRequestSchema.safeParse({
        ...minimalValid,
        hourlyRate: -5,
      }).success,
    ).toBe(false);
  });
});
