import { i18n } from '@lingui/core';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { STANDARD_OBJECT_FIELDS } from 'kovaa-lab-shared/metadata';

import { STANDARD_SELECT_OPTION_LABELS } from '@/object-metadata/constants/StandardSelectOptionLabels';
import { translateStandardSelectOptionLabel } from '@/object-metadata/utils/translateStandardSelectOptionLabel';
import { mockedStandardObjectMetadataQueryResult } from '~/testing/mock-data/generated/metadata/objects/mock-objects-metadata';

const STAGE_FIELD = STANDARD_OBJECT_FIELDS.opportunity.stage
  .universalIdentifier as string;
const SCREENING_ID = '20202020-e685-4671-ac32-26d304dacb6e';

const messageId = (source: string) =>
  generateMessageId(source, 'fieldMetadata.label');

// The front catalog does not carry these ids yet -- root owns the translations --
// so the French is loaded under the id Lingui will key them by. That makes the
// msgid itself part of the assertion.
const activateFrench = () => {
  i18n.load('fr-FR', {
    [messageId('New')]: 'Nouveau',
    [messageId('Screening')]: 'Présélection',
    [messageId('Proposal')]: 'Proposition',
  });
  i18n.activate('fr-FR');
};

const translate = (option: { id?: string | null; label: string }) =>
  translateStandardSelectOptionLabel({
    fieldUniversalIdentifier: STAGE_FIELD,
    option,
  });

describe('translateStandardSelectOptionLabel', () => {
  afterEach(() => {
    i18n.activate('en');
  });

  it('translates the shipped stage labels on a French locale', () => {
    activateFrench();

    expect(
      [
        { id: '20202020-8e01-4afd-9c39-d2063097587a', label: 'New' },
        { id: SCREENING_ID, label: 'Screening' },
        { id: '20202020-696e-4f6b-91bc-f413e9b2f654', label: 'Proposal' },
      ].map(translate),
    ).toEqual(['Nouveau', 'Présélection', 'Proposition']);
  });

  it('returns a renamed stage verbatim, in any locale', () => {
    activateFrench();

    expect(translate({ id: SCREENING_ID, label: 'Premier contact' })).toBe(
      'Premier contact',
    );
  });

  it('returns a stage renamed to another shipped wording verbatim', () => {
    activateFrench();

    // The echo test could not tell this from a translation; two facts can
    expect(translate({ id: SCREENING_ID, label: 'Customer' })).toBe('Customer');
  });

  it('reads the raw labels on an English locale', () => {
    i18n.activate('en');

    expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
      'Screening',
    );
  });

  it('leaves a custom field alone', () => {
    activateFrench();

    expect(
      translateStandardSelectOptionLabel({
        fieldUniversalIdentifier: 'f6a1c0de-0000-4000-8000-000000000001',
        option: { id: SCREENING_ID, label: 'Screening' },
      }),
    ).toBe('Screening');
  });

  it('leaves an operator-added option on a standard field alone', () => {
    activateFrench();

    expect(
      translate({ id: 'c0ffee00-0000-4000-8000-000000000002', label: 'New' }),
    ).toBe('New');
  });

  it('leaves an option with no id alone', () => {
    activateFrench();

    expect(translate({ label: 'Screening' })).toBe('Screening');
  });

  it('leaves an unidentified field alone', () => {
    activateFrench();

    expect(
      translateStandardSelectOptionLabel({
        fieldUniversalIdentifier: null,
        option: { id: SCREENING_ID, label: 'Screening' },
      }),
    ).toBe('Screening');
  });

  // Drift guard: the ids and English sources are the standard application's, so
  // they must keep matching the generated metadata rather than a hand copy.
  it('matches the generated standard metadata', () => {
    const stageField = mockedStandardObjectMetadataQueryResult.objects.edges
      .flatMap((objectEdge) => objectEdge.node.fieldsList)
      .find((field) => field.universalIdentifier === STAGE_FIELD);

    expect(stageField).toBeDefined();

    const shippedLabelByOptionId = new Map<string, string>(
      (stageField?.options ?? []).map(
        (option: { id: string; label: string }) => [option.id, option.label],
      ),
    );

    expect(
      STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD].map(
        ({ optionId, sourceLabel }) => [optionId, sourceLabel],
      ),
    ).toEqual(
      STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD].map(({ optionId }) => [
        optionId,
        shippedLabelByOptionId.get(optionId),
      ]),
    );

    expect(STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD]).toHaveLength(
      shippedLabelByOptionId.size,
    );
  });
  // Root found this by compiling: the Lingui SWC plugin strips `message` from a
  // descriptor in a production build, leaving `{ id }`. These three guard the
  // shape the comparison depends on. They run in dev, so they prove the logic
  // does not read a compile-time field -- they do not exercise a real build.
  describe('durability through a production build', () => {
    const stageLabels = STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD];

    it('carries the shipped wording as a plain string, not a descriptor field', () => {
      for (const { sourceLabel } of stageLabels) {
        expect(typeof sourceLabel).toBe('string');
        expect(sourceLabel.length).toBeGreaterThan(0);
      }
    });

    it('keeps the plain string and the descriptor in step while the build keeps both', () => {
      for (const { sourceLabel, shippedLabel } of stageLabels) {
        if (typeof shippedLabel.message === 'string') {
          expect(shippedLabel.message).toBe(sourceLabel);
        }
      }
    });

    it('still translates once the descriptor is reduced to its id', () => {
      const restoreMessages = stageLabels.map(({ shippedLabel }) => ({
        shippedLabel,
        message: shippedLabel.message,
      }));

      // exactly what the production build emits
      for (const { shippedLabel } of stageLabels) {
        shippedLabel.message = undefined;
      }

      try {
        activateFrench();

        expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
          'Présélection',
        );
        expect(translate({ id: SCREENING_ID, label: 'Premier contact' })).toBe(
          'Premier contact',
        );
      } finally {
        for (const { shippedLabel, message } of restoreMessages) {
          shippedLabel.message = message;
        }
      }
    });
  });
  // A locale with no entry for these ids must read the shipped English. In a
  // production build the descriptor is id-only, so without this the hash itself
  // reaches the screen.
  describe('a locale the catalog does not cover', () => {
    const stageLabels = STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD];
    const screeningMessageId = messageId('Screening');

    const activateGermanWithoutTheStageIds = () => {
      i18n.load('de-DE', { someOtherId: 'Irgendetwas' });
      i18n.activate('de-DE');
    };

    const withProductionDescriptors = (assert: () => void) => {
      const restoreMessages = stageLabels.map(({ shippedLabel }) => ({
        shippedLabel,
        message: shippedLabel.message,
      }));

      for (const { shippedLabel } of stageLabels) {
        shippedLabel.message = undefined;
      }

      try {
        assert();
      } finally {
        for (const { shippedLabel, message } of restoreMessages) {
          shippedLabel.message = message;
        }
      }
    };

    it('reads the shipped English, not the message id', () => {
      activateGermanWithoutTheStageIds();

      expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
        'Screening',
      );
    });

    it('reads the shipped English once the descriptor is id-only', () => {
      activateGermanWithoutTheStageIds();

      withProductionDescriptors(() => {
        const translated = translate({
          id: SCREENING_ID,
          label: 'Screening',
        });

        expect(translated).toBe('Screening');
        expect(translated).not.toBe(screeningMessageId);
      });
    });

    it('never borrows another locale that does have the entry', () => {
      // French is loaded, German is active: German must not read French
      i18n.load('fr-FR', { [screeningMessageId]: 'Présélection' });
      activateGermanWithoutTheStageIds();

      withProductionDescriptors(() => {
        expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
          'Screening',
        );
      });
    });

    it('still keeps a renamed stage verbatim', () => {
      activateGermanWithoutTheStageIds();

      withProductionDescriptors(() => {
        expect(translate({ id: SCREENING_ID, label: 'Premier contact' })).toBe(
          'Premier contact',
        );
      });
    });

    it('resolves normally again on a locale that does have the entry', () => {
      activateFrench();

      withProductionDescriptors(() => {
        expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
          'Présélection',
        );
      });
    });
  });
  // Confirmed against lingui: a present-but-empty entry resolves to the id for an
  // empty string, and to an empty string for an empty array. A stray untranslated
  // msgstr produces either, and a merged English fallback can be shadowed by one.
  describe('an entry that is present but unusable', () => {
    const stageLabels = STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD];
    const screeningMessageId = messageId('Screening');

    const withProductionDescriptors = (assert: () => void) => {
      const restoreMessages = stageLabels.map(({ shippedLabel }) => ({
        shippedLabel,
        message: shippedLabel.message,
      }));

      for (const { shippedLabel } of stageLabels) {
        shippedLabel.message = undefined;
      }

      try {
        assert();
      } finally {
        for (const { shippedLabel, message } of restoreMessages) {
          shippedLabel.message = message;
        }
      }
    };

    it('reads the shipped English when the entry is an empty string', () => {
      i18n.load('de-DE', { [screeningMessageId]: '' });
      i18n.activate('de-DE');

      withProductionDescriptors(() => {
        const translated = translate({ id: SCREENING_ID, label: 'Screening' });

        expect(translated).toBe('Screening');
        expect(translated).not.toBe(screeningMessageId);
      });
    });

    it('reads the shipped English when the entry is an empty array', () => {
      i18n.load('de-DE', { [screeningMessageId]: [] });
      i18n.activate('de-DE');

      withProductionDescriptors(() => {
        expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
          'Screening',
        );
      });
    });

    it('still keeps a renamed stage verbatim', () => {
      i18n.load('de-DE', { [screeningMessageId]: '' });
      i18n.activate('de-DE');

      withProductionDescriptors(() => {
        expect(translate({ id: SCREENING_ID, label: 'Premier contact' })).toBe(
          'Premier contact',
        );
      });
    });
  });
});
