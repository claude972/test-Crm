import { describe, it, expect } from 'vitest';
import {
  SOCIAL_NETWORKS,
  socialProfileUrl,
  socialProfileHandle,
} from '../socialProfiles';

describe('socialProfiles', () => {
  describe('socialProfileUrl', () => {
    it('builds the link from a handle', () => {
      expect(socialProfileUrl('github', 'kovaa-lab')).toBe(
        'https://github.com/kovaa-lab'
      );
      expect(socialProfileUrl('linkedin', 'company/kovaa-lab')).toBe(
        'https://linkedin.com/company/kovaa-lab'
      );
      expect(socialProfileUrl('twitter', 'kovaa-labapp')).toBe(
        'https://x.com/kovaa-labapp'
      );
    });

    it('keeps a full link as it is', () => {
      expect(socialProfileUrl('youtube', 'https://youtu.be/abc')).toBe(
        'https://youtu.be/abc'
      );
    });

    it('returns an empty string for a handle on an unknown network', () => {
      expect(socialProfileUrl('whatsapp', 'kovaa-lab')).toBe('');
    });

    it('returns an empty string for a blank handle', () => {
      expect(socialProfileUrl('github', '  ')).toBe('');
      expect(socialProfileUrl('github', undefined)).toBe('');
    });
  });

  describe('socialProfileHandle', () => {
    it('strips the protocol, www and host', () => {
      expect(
        socialProfileHandle('linkedin', 'https://www.linkedin.com/company/ing')
      ).toBe('company/ing');
      expect(
        socialProfileHandle('instagram', 'http://instagram.com/ing/')
      ).toBe('ing');
    });

    it('recognises the other hosts of a network', () => {
      expect(socialProfileHandle('x', 'https://twitter.com/ING_news')).toBe(
        'ING_news'
      );
    });

    it('returns links on an unknown host unchanged', () => {
      expect(socialProfileHandle('youtube', 'https://youtu.be/abc')).toBe(
        'https://youtu.be/abc'
      );
    });

    it('returns a plain handle unchanged', () => {
      expect(socialProfileHandle('github', 'kovaa-lab')).toBe('kovaa-lab');
      expect(socialProfileHandle('github', '')).toBe('');
    });
  });

  it('round-trips every network', () => {
    Object.keys(SOCIAL_NETWORKS).forEach(network => {
      const url = socialProfileUrl(network, 'acme');
      expect(socialProfileHandle(network, url)).toBe('acme');
    });
  });
});
