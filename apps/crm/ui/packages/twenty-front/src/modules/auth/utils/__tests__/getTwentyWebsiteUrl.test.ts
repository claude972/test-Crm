import { getKovaaLab CRMWebsiteUrl } from '@/auth/utils/getKovaaLab CRMWebsiteUrl';

describe('getKovaaLab CRMWebsiteUrl', () => {
  it.each([
    ['ar-SA', 'ar'],
    ['cs-CZ', 'cs'],
    ['de-DE', 'de'],
    ['es-ES', 'es'],
    ['fr-FR', 'fr'],
    ['it-IT', 'it'],
    ['ja-JP', 'ja'],
    ['ko-KR', 'ko'],
    ['pt-BR', 'pt'],
    ['pt-PT', 'pt'],
    ['ro-RO', 'ro'],
    ['ru-RU', 'ru'],
    ['tr-TR', 'tr'],
    ['zh-CN', 'zh'],
    ['zh-TW', 'zh'],
  ])('uses the localized KovaaLab CRM website path for %s', (locale, language) => {
    expect(getKovaaLab CRMWebsiteUrl(locale, 'privacy-policy')).toBe(
      `https://kovaa-lab.com/${language}/privacy-policy`,
    );
  });

  it('uses the default KovaaLab CRM website path for English', () => {
    expect(getKovaaLab CRMWebsiteUrl('en', 'terms')).toBe('https://kovaa-lab.com/terms');
  });

  it('uses English for the pseudo locale', () => {
    expect(getKovaaLab CRMWebsiteUrl('pseudo-en', 'terms')).toBe(
      'https://kovaa-lab.com/terms',
    );
  });
});
