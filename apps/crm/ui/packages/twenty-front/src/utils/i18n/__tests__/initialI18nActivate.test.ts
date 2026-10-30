import { fromStorage, fromUrl } from '@lingui/detect-locale';
import { initialI18nActivate } from '~/utils/i18n/initialI18nActivate';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('@lingui/detect-locale', () => ({
  fromStorage: jest.fn(),
  fromUrl: jest.fn(),
}));
jest.mock('~/utils/i18n/dynamicActivate', () => ({
  dynamicActivate: jest.fn(),
}));

describe('explicit language choices before French application default', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(fromStorage).mockReturnValue(null);
    jest.mocked(fromUrl).mockReturnValue(null);
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-US',
    });
  });
  it('defaults to French without explicit preferences even for an English browser', () => {
    initialI18nActivate();
    expect(dynamicActivate).toHaveBeenCalledWith('fr-FR');
  });
  it('preserves an explicit stored English preference', () => {
    jest.mocked(fromStorage).mockReturnValue('en');
    initialI18nActivate();
    expect(dynamicActivate).toHaveBeenCalledWith('en');
  });
  it('gives an explicit URL language priority over storage and persists that choice', () => {
    jest.mocked(fromStorage).mockReturnValue('en');
    jest.mocked(fromUrl).mockReturnValue('fr');
    initialI18nActivate();
    expect(dynamicActivate).toHaveBeenCalledWith('fr-FR');
    expect(localStorage.getItem('locale')).toBe('fr-FR');
  });
});
