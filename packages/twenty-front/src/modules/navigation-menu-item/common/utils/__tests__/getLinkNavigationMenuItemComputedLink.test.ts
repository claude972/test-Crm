import { getLinkNavigationMenuItemComputedLink } from '@/navigation-menu-item/common/utils/getLinkNavigationMenuItemComputedLink';

describe('getLinkNavigationMenuItemComputedLink', () => {
  it('keeps absolute URLs', () => {
    expect(
      getLinkNavigationMenuItemComputedLink({ link: 'https://kovaa-lab.com' }),
    ).toBe('https://kovaa-lab.com');
  });

  it('prefixes bare domains with https', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: 'kovaa-lab.com' })).toBe(
      'https://kovaa-lab.com',
    );
  });

  it('keeps internal app paths', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: '/workflows' })).toBe(
      '/workflows',
    );
  });

  it('keeps protocol-relative URLs external', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: '//evil.com' })).toBe(
      'https:////evil.com',
    );
  });

  it('keeps a path with control characters external', () => {
    expect(
      getLinkNavigationMenuItemComputedLink({ link: '/\t/evil.com' }),
    ).toBe('https:///\t/evil.com');
  });

  it('keeps an uppercase scheme as is', () => {
    expect(
      getLinkNavigationMenuItemComputedLink({ link: 'HTTPS://kovaa-lab.com' }),
    ).toBe('HTTPS://kovaa-lab.com');
  });

  it('keeps localhost URLs external', () => {
    expect(
      getLinkNavigationMenuItemComputedLink({
        link: 'localhost:3000/workflows',
      }),
    ).toBe('https://localhost:3000/workflows');
  });

  it('returns an empty string without a link', () => {
    expect(getLinkNavigationMenuItemComputedLink({ link: null })).toBe('');
  });
});
