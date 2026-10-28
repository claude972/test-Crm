import { type AppLocale } from 'kovaa-lab-shared/translations';

export type TranslationCatalogsByLocale = Partial<
  Record<AppLocale, Record<string, string>>
>;
