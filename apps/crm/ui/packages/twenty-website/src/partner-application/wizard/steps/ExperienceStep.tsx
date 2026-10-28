'use client';

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';

import { ChipMultiSelect, Field, TextareaField, TextField } from '@/ui';

import { PARTNER_KOVAALAB_EXPERIENCE_OPTIONS } from '../../data/partner-kovaa-lab-experience-options';
import { PARTNER_APPLICATION_COPY } from '../../partner-application-copy';
import { type PartnerApplicationController } from '../../use-partner-application-state';

const FIELDS = PARTNER_APPLICATION_COPY.fields;

export function ExperienceStep({
  controller,
}: {
  controller: PartnerApplicationController;
}) {
  const { i18n } = useLingui();
  const { setField, state, toggleExperience } = controller;

  const experienceOptions = PARTNER_KOVAALAB_EXPERIENCE_OPTIONS.map((option) => ({
    label: i18n._(option.label),
    value: option.value,
  }));

  return (
    <>
      <Field
        hint={i18n._(FIELDS.kovaa-labExperienceHint)}
        label={i18n._(FIELDS.kovaa-labExperience)}
      >
        <ChipMultiSelect
          ariaLabel={i18n._(FIELDS.kovaa-labExperience)}
          invalid={state.fieldErrors.kovaa-labExperience !== undefined}
          onToggle={toggleExperience}
          options={experienceOptions}
          values={state.kovaa-labExperience}
        />
      </Field>
      <Field
        hint={i18n._(FIELDS.kovaa-labExperienceNotesHint)}
        label={i18n._(FIELDS.kovaa-labExperienceNotes)}
      >
        <TextareaField
          ariaLabel={i18n._(FIELDS.kovaa-labExperienceNotes)}
          invalid={state.fieldErrors.kovaa-labExperienceNotes !== undefined}
          name="kovaa-labExperienceNotes"
          onValueChange={(value) => setField('kovaa-labExperienceNotes', value)}
          placeholder={i18n._(FIELDS.kovaa-labExperienceNotesPlaceholder)}
          value={state.kovaa-labExperienceNotes}
        />
      </Field>
      <Field
        hint={i18n._(FIELDS.kovaa-labExperienceProofLinkHint)}
        label={i18n._(FIELDS.kovaa-labExperienceProofLink)}
      >
        <TextField
          ariaLabel={i18n._(FIELDS.kovaa-labExperienceProofLink)}
          inputMode="url"
          invalid={state.fieldErrors.kovaa-labExperienceProofLink !== undefined}
          name="kovaa-labExperienceProofLink"
          onValueChange={(value) =>
            setField('kovaa-labExperienceProofLink', value)
          }
          placeholder={i18n._(msg`https://`)}
          value={state.kovaa-labExperienceProofLink}
        />
      </Field>
    </>
  );
}
