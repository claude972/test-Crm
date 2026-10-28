import { LinkType } from '@/ui/field/display/components/SocialLink/LinkType';
import { checkUrlType } from '@/ui/field/display/utils/checkUrlType';

describe('checkUrlType', () => {
  it('should detect LinkedIn urls', () => {
    expect(checkUrlType('https://www.linkedin.com/in/john')).toBe(
      LinkType.LinkedIn,
    );
    expect(checkUrlType('linkedin.com/company/kovaa-lab')).toBe(LinkType.LinkedIn);
  });

  it('should detect Twitter urls', () => {
    expect(checkUrlType('https://twitter.com/kovaa-lab')).toBe(LinkType.Twitter);
  });

  it('should detect X urls as Twitter', () => {
    expect(checkUrlType('https://x.com/kovaa-lab')).toBe(LinkType.Twitter);
  });

  it('should detect Facebook urls', () => {
    expect(checkUrlType('https://www.facebook.com/kovaa-lab')).toBe(
      LinkType.Facebook,
    );
  });

  it('should detect Instagram urls', () => {
    expect(checkUrlType('https://www.instagram.com/ptcrash')).toBe(
      LinkType.Instagram,
    );
    expect(checkUrlType('instagram.com/ptcrash')).toBe(LinkType.Instagram);
  });

  it('should detect TikTok urls', () => {
    expect(checkUrlType('https://www.tiktok.com/@kovaa-lab')).toBe(
      LinkType.TikTok,
    );
    expect(checkUrlType('tiktok.com/@kovaa-lab')).toBe(LinkType.TikTok);
  });

  it('should detect Bluesky urls', () => {
    expect(checkUrlType('https://bsky.app/profile/kovaa-lab.bsky.social')).toBe(
      LinkType.Bluesky,
    );
  });

  it('should fall back to a generic url type', () => {
    expect(checkUrlType('https://example.com')).toBe(LinkType.Url);
    expect(checkUrlType('not-a-url')).toBe(LinkType.Url);
    expect(checkUrlType('https://instagram.com')).toBe(LinkType.Url);
    expect(checkUrlType('https://www.tiktok.com/video/123')).toBe(LinkType.Url);
    expect(checkUrlType('https://bsky.app')).toBe(LinkType.Url);
  });
});
