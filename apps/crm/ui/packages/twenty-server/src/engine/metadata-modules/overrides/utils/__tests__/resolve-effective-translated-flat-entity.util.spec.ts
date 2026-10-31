import { setupI18n } from '@lingui/core';
import { generateMessageId } from 'kovaa-lab-shared/i18n';

import { messages as frenchMessages } from 'src/engine/core-modules/i18n/locales/generated/fr-FR';
import { type EffectiveEntityI18nContext } from 'src/engine/metadata-modules/overrides/types/effective-entity-i18n-context.type';
import { resolveEffectiveTranslatedFlatEntity } from 'src/engine/metadata-modules/overrides/utils/resolve-effective-translated-flat-entity.util';

const CUSTOM = '20202020-aaaa-4aaa-8aaa-000000000001';
const OWNER = '20202020-bbbb-4bbb-8bbb-000000000002';

const flatFieldMetadata = {
  applicationUniversalIdentifier: OWNER,
  label: 'Company',
  description: null,
  icon: 'IconBuilding',
  isActive: true,
  overrides: null as unknown,
};

const buildI18nContext = (
  partial: Partial<EffectiveEntityI18nContext> = {},
): EffectiveEntityI18nContext => ({
  locale: 'fr-FR',
  i18nInstance: { _: (id: string) => `translated:${id}` },
  isStandardApp: true,
  workspaceCustomApplicationUniversalIdentifier: CUSTOM,
  ownerApplicationUniversalIdentifier: OWNER,
  ...partial,
});

describe('resolveEffectiveTranslatedFlatEntity', () => {
  it('translates a standard label through the catalog when nothing overrides it', () => {
    const messageId = generateMessageId('Company', 'fieldMetadata.label');

    expect(
      resolveEffectiveTranslatedFlatEntity({
        metadataName: 'fieldMetadata',
        flatEntity: flatFieldMetadata,
        i18nContext: buildI18nContext(),
      }).label,
    ).toBe(`translated:${messageId}`);
  });

  it('prefers a workspace translation, then the override, for the locale', () => {
    const resolve = (overrides: unknown) =>
      resolveEffectiveTranslatedFlatEntity({
        metadataName: 'fieldMetadata',
        flatEntity: { ...flatFieldMetadata, overrides },
        i18nContext: buildI18nContext(),
      }).label;

    expect(
      resolve({
        [CUSTOM]: {
          label: 'Société',
          translations: { 'fr-FR': { label: 'Entreprise' } },
        },
      }),
    ).toBe('Entreprise');
    expect(resolve({ [CUSTOM]: { label: 'Société' } })).toBe('Société');
  });

  it('resolves non-translatable properties with their own type', () => {
    const effective = resolveEffectiveTranslatedFlatEntity({
      metadataName: 'fieldMetadata',
      flatEntity: {
        ...flatFieldMetadata,
        overrides: { [CUSTOM]: { icon: 'IconStar', isActive: false } },
      },
      i18nContext: buildI18nContext(),
    });

    expect(effective.icon).toBe('IconStar');
    expect(effective.isActive).toBe(false);
  });

  const resolveCustomLabel = (
    label: string,
    i18nInstance: EffectiveEntityI18nContext['i18nInstance'],
  ) =>
    resolveEffectiveTranslatedFlatEntity({
      metadataName: 'fieldMetadata',
      flatEntity: {
        ...flatFieldMetadata,
        label,
        applicationUniversalIdentifier: CUSTOM,
      },
      i18nContext: buildI18nContext({
        isStandardApp: false,
        ownerApplicationUniversalIdentifier: CUSTOM,
        i18nInstance,
      }),
    }).label;

  it("translates a custom entity's label through KovaaLab CRM's catalog when it has no catalog of its own", () => {
    const messageId = generateMessageId('Company', 'fieldMetadata.label');

    expect(
      resolveCustomLabel('Company', { _: (id: string) => `translated:${id}` }),
    ).toBe(`translated:${messageId}`);
  });

  it("keeps a custom label that KovaaLab CRM's catalog does not know", () => {
    expect(
      resolveCustomLabel('Contract renewal', { _: (id: string) => id }),
    ).toBe('Contract renewal');
  });

  it("translates a custom object's system field label with KovaaLab CRM's real catalog", () => {
    const i18n = setupI18n({
      locale: 'fr-FR',
      messages: { 'fr-FR': frenchMessages },
    });
    const translated = resolveCustomLabel('Creation date', i18n);

    expect(translated).toBe(
      i18n._(generateMessageId('Creation date', 'fieldMetadata.label')),
    );
    expect(translated).not.toBe('Creation date');
  });
  // The stage names users actually see: a jsonb array the scalar registry never reaches
  describe('select option labels', () => {
    type TestOption = {
      id?: string;
      value: string;
      label: string;
      position?: number;
      color?: string;
    };

    const realI18n = () =>
      setupI18n({ locale: 'fr-FR', messages: { 'fr-FR': frenchMessages } });

    const resolveOptions = (
      options: readonly TestOption[] | null,
      i18nInstance: EffectiveEntityI18nContext['i18nInstance'],
    ): readonly TestOption[] | null =>
      resolveEffectiveTranslatedFlatEntity({
        metadataName: 'fieldMetadata',
        flatEntity: { ...flatFieldMetadata, label: 'Stage', options },
        i18nContext: buildI18nContext({ i18nInstance }),
      }).options;

    const resolveOptionList = (
      options: readonly TestOption[],
      i18nInstance: EffectiveEntityI18nContext['i18nInstance'],
    ): readonly TestOption[] => {
      const resolved = resolveOptions(options, i18nInstance);

      if (resolved === null) {
        throw new Error('expected the resolver to return select options');
      }

      return resolved;
    };

    const standardStageOptions: readonly TestOption[] = [
      {
        id: '20202020-8e01-4afd-9c39-d2063097587a',
        value: 'NEW',
        label: 'New',
        position: 0,
        color: 'red',
      },
      {
        id: '20202020-e685-4671-ac32-26d304dacb6e',
        value: 'SCREENING',
        label: 'Screening',
        position: 1,
        color: 'purple',
      },
      {
        id: '20202020-696e-4f6b-91bc-f413e9b2f654',
        value: 'PROPOSAL',
        label: 'Proposal',
        position: 3,
        color: 'turquoise',
      },
    ];

    it('translates the standard stage names with the real French catalog', () => {
      expect(
        resolveOptionList(standardStageOptions, realI18n()).map(
          (option) => option.label,
        ),
      ).toEqual(['Nouveau', 'Présélection', 'Proposition']);
    });

    it('leaves the api value, the id, the position and the color untouched', () => {
      expect(resolveOptionList(standardStageOptions, realI18n())[1]).toEqual({
        id: '20202020-e685-4671-ac32-26d304dacb6e',
        value: 'SCREENING',
        label: 'Présélection',
        position: 1,
        color: 'purple',
      });
    });

    it('keeps a personalised stage name the catalog does not know', () => {
      const personalisedStage: TestOption = {
        id: '20202020-e685-4671-ac32-26d304dacb6e',
        value: 'SCREENING',
        label: 'Premier contact',
        position: 1,
        color: 'purple',
      };

      expect(resolveOptionList([personalisedStage], realI18n())).toEqual([
        personalisedStage,
      ]);
    });

    it('serves every locale from the same catalog lookup, not a French branch', () => {
      const messageId = generateMessageId('Screening', 'fieldMetadata.label');

      expect(
        resolveOptionList([{ value: 'SCREENING', label: 'Screening' }], {
          _: (id: string) => `translated:${id}`,
        }),
      ).toEqual([{ value: 'SCREENING', label: `translated:${messageId}` }]);
    });

    it('leaves a field with no options alone', () => {
      expect(resolveOptions(null, realI18n())).toBeNull();
    });
  });
});
