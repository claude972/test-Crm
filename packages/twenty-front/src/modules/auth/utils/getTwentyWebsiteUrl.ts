import {
  DOCUMENTATION_DEFAULT_LANGUAGE,
  DOCUMENTATION_SUPPORTED_LANGUAGES,
  type DocumentationSupportedLanguage,
} from 'kovaa-lab-shared/constants';

const KOVAALAB_WEBSITE_HREF = 'https://kovaa-lab.com';

type KovaaLab CRMWebsitePage = 'terms' | 'privacy-policy';

export const getKovaaLab CRMWebsiteUrl = (
  locale: string,
  page: KovaaLab CRMWebsitePage,
): string => {
  const language = new Intl.Locale(locale).language;

  const isLocalizedWebsitePath =
    language !== DOCUMENTATION_DEFAULT_LANGUAGE &&
    DOCUMENTATION_SUPPORTED_LANGUAGES.some(
      (supportedLanguage: DocumentationSupportedLanguage) =>
        supportedLanguage === language,
    );

  const url = new URL(
    isLocalizedWebsitePath ? `/${language}/${page}` : `/${page}`,
    KOVAALAB_WEBSITE_HREF,
  );

  return url.toString();
};
