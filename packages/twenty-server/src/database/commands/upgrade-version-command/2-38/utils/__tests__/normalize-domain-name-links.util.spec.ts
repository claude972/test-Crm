import { normalizeDomainNameLinks } from 'src/database/commands/upgrade-version-command/2-38/utils/normalize-domain-name-links.util';

describe('normalizeDomainNameLinks', () => {
  it('should rewrite a url-shaped primary link to its bare domain', () => {
    expect(
      normalizeDomainNameLinks({
        primaryLinkUrl: 'https://www.kovaa-lab.com/careers',
        secondaryLinks: null,
      }),
    ).toEqual({
      changed: true,
      value: {
        primaryLinkUrl: 'kovaa-lab.com',
        secondaryLinks: null,
      },
    });
  });

  it('should rewrite secondary links too', () => {
    expect(
      normalizeDomainNameLinks({
        primaryLinkUrl: 'kovaa-lab.com',
        secondaryLinks: [{ url: 'HTTPS://KovaaLab CRM-CRM.com/', label: 'Old' }],
      }),
    ).toEqual({
      changed: true,
      value: {
        primaryLinkUrl: 'kovaa-lab.com',
        secondaryLinks: [{ url: 'kovaa-lab-crm.com', label: 'Old' }],
      },
    });
  });

  it('should report no change when every link is already a bare domain', () => {
    expect(
      normalizeDomainNameLinks({
        primaryLinkUrl: 'kovaa-lab.com',
        secondaryLinks: [{ url: 'crm.dev', label: '' }],
      }).changed,
    ).toBe(false);
  });

  it('should leave a secondary link without a url untouched', () => {
    expect(
      normalizeDomainNameLinks({
        primaryLinkUrl: 'kovaa-lab.com',
        secondaryLinks: [{ url: '', label: 'Old' }],
      }),
    ).toEqual({
      changed: false,
      value: {
        primaryLinkUrl: 'kovaa-lab.com',
        secondaryLinks: [{ url: '', label: 'Old' }],
      },
    });
  });

  it('should report no change for a company without a domain', () => {
    expect(
      normalizeDomainNameLinks({
        primaryLinkUrl: '',
        secondaryLinks: null,
      }).changed,
    ).toBe(false);
  });
});
