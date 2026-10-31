import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

import { APP_LOCALES, SOURCE_LOCALE } from 'kovaa-lab-shared/translations';

import { ConfigVariables } from 'src/engine/core-modules/twenty-config/config-variables';

// The instance default a new account and a new membership start from.
//
// It exists because the two sites that create them used to fall back to the
// i18n SOURCE_LOCALE, or to a literal 'en', which made a French deployment
// hand every new membership an English interface. It is a DEFAULT and nothing
// more: an explicit locale, whether sent with the sign-up or already chosen by
// a member, is passed through by the callers and is never overwritten here.
describe('DEFAULT_LOCALE', () => {
  const build = (overrides: Record<string, unknown> = {}) =>
    plainToClass(ConfigVariables, overrides);

  it('keeps the source locale when nothing is configured, so an existing deployment does not change behaviour', () => {
    expect(build().DEFAULT_LOCALE).toBe(SOURCE_LOCALE);
  });

  it('accepts a supported locale', () => {
    const configured = build({ DEFAULT_LOCALE: 'fr-FR' });

    expect(configured.DEFAULT_LOCALE).toBe('fr-FR');
    expect(
      validateSync(configured).filter(
        (error) => error.property === 'DEFAULT_LOCALE',
      ),
    ).toEqual([]);
  });

  it('refuses a locale the application does not ship, instead of serving an untranslated interface', () => {
    const errors = validateSync(build({ DEFAULT_LOCALE: 'xx-XX' })).filter(
      (error) => error.property === 'DEFAULT_LOCALE',
    );

    expect(errors).toHaveLength(1);
  });

  it('only ever offers a locale the catalogues contain', () => {
    expect(Object.keys(APP_LOCALES)).toContain(build().DEFAULT_LOCALE);
  });
});
