import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { STANDARD_OBJECT_FIELDS } from 'kovaa-lab-shared/metadata';

export type ShippedSelectOptionLabel = {
  optionId: string;
  // A plain literal on purpose, and duplicated from the descriptor on purpose.
  // The Lingui SWC plugin strips `message` from a descriptor in a production
  // build, leaving the id, so the comparison that decides whether a stored
  // label is still the shipped one must not read it from there.
  sourceLabel: string;
  shippedLabel: MessageDescriptor;
};

// Identity, not a dictionary: the English source here is what a stored label is
// compared against, and Lingui owns every translation of it, so no locale string
// appears in code. The ids are the standard application's own, and the field is
// identified through the shared constant rather than repeated here.
export const STANDARD_SELECT_OPTION_LABELS: Record<
  string,
  readonly ShippedSelectOptionLabel[]
> = {
  [STANDARD_OBJECT_FIELDS.opportunity.stage.universalIdentifier]: [
    {
      optionId: '20202020-8e01-4afd-9c39-d2063097587a',
      sourceLabel: 'New',
      shippedLabel: msg({ message: `New`, context: 'fieldMetadata.label' }),
    },
    {
      optionId: '20202020-e685-4671-ac32-26d304dacb6e',
      sourceLabel: 'Screening',
      shippedLabel: msg({
        message: `Screening`,
        context: 'fieldMetadata.label',
      }),
    },
    {
      optionId: '20202020-dde9-4acc-b5ca-f6531a8ecb4a',
      sourceLabel: 'Meeting',
      shippedLabel: msg({ message: `Meeting`, context: 'fieldMetadata.label' }),
    },
    {
      optionId: '20202020-696e-4f6b-91bc-f413e9b2f654',
      sourceLabel: 'Proposal',
      shippedLabel: msg({
        message: `Proposal`,
        context: 'fieldMetadata.label',
      }),
    },
    {
      optionId: '20202020-0bb5-4a6f-a8b2-774bbad21104',
      sourceLabel: 'Customer',
      shippedLabel: msg({
        message: `Customer`,
        context: 'fieldMetadata.label',
      }),
    },
  ],
};
