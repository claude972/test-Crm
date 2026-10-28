import { INITIAL_PARTNER_APPLICATION_STATE } from './partner-application-state';
import { validatePartnerApplicationStep } from './validate-partner-application-step';

const validExperienceNotes =
  'Built a custom KovaaLab CRM app for a property-management client, modeled leases and ' +
  'tenants as data models, automated renewal workflows, and shipped a front component ' +
  'for the broker dashboard with role-based views.';

describe('validatePartnerApplicationStep', () => {
  it('requires experience milestones, narrative, and proof URL on Experience', () => {
    const errors = validatePartnerApplicationStep({
      ...INITIAL_PARTNER_APPLICATION_STATE,
      stepIndex: 3,
    });
    expect(errors.kovaa-labExperience).toBe('required');
    expect(errors.kovaa-labExperienceNotes).toBe('required');
    expect(errors.kovaa-labExperienceProofLink).toBe('required');
  });

  it('rejects a narrative under 200 characters on Experience', () => {
    const errors = validatePartnerApplicationStep({
      ...INITIAL_PARTNER_APPLICATION_STATE,
      stepIndex: 3,
      kovaa-labExperience: ['WORKFLOWS'],
      kovaa-labExperienceNotes: 'Too short for a real implementation narrative.',
      kovaa-labExperienceProofLink: 'https://www.loom.com/share/example',
    });
    expect(errors.kovaa-labExperienceNotes).toBe('too_short');
  });

  it('rejects an invalid proof URL on Experience', () => {
    const errors = validatePartnerApplicationStep({
      ...INITIAL_PARTNER_APPLICATION_STATE,
      stepIndex: 3,
      kovaa-labExperience: ['CUSTOM_APPS'],
      kovaa-labExperienceNotes: validExperienceNotes,
      kovaa-labExperienceProofLink: 'not-a-url',
    });
    expect(errors.kovaa-labExperienceProofLink).toBe('invalid_url');
  });

  it('accepts a complete Experience step', () => {
    const errors = validatePartnerApplicationStep({
      ...INITIAL_PARTNER_APPLICATION_STATE,
      stepIndex: 3,
      kovaa-labExperience: ['CUSTOM_APPS', 'DATA_MODELS'],
      kovaa-labExperienceNotes: validExperienceNotes,
      kovaa-labExperienceProofLink: 'https://www.loom.com/share/example',
    });
    expect(errors).toEqual({});
  });
});
