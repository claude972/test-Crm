import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { readHermesMailboxBody } from '@/hermes-mailbox-ui/utils/readHermesMailboxBody';

// The server sanitises received HTML and is the authority. These cases cover
// the client-side net on top of it: it has no option to relax anything, so
// there is no "allow" path to test — only that nothing is fetched and that
// links leave nothing behind.
const readHtml = (html: string, inlineImages: HermesMailboxInlineImage[] = []) =>
  readHermesMailboxBody({ kind: 'html', html }, inlineImages);

const htmlOf = (render: ReturnType<typeof readHermesMailboxBody>) =>
  render.kind === 'html' ? render.html : '';

describe('readHermesMailboxBody', () => {
  describe('a missing or empty body', () => {
    it('should report an absent body as empty rather than as blank markup', () => {
      expect(readHermesMailboxBody(null)).toEqual({ kind: 'empty' });
    });

    it('should report a whitespace-only text body as empty', () => {
      expect(
        readHermesMailboxBody({ kind: 'text', text: '   \n  ' }),
      ).toEqual({ kind: 'empty' });
    });
  });

  describe('a plain text body', () => {
    it('should pass the text through untouched, whitespace included', () => {
      expect(
        readHermesMailboxBody({
          kind: 'text',
          text: 'Bonjour,\n\n  Voici le devis.',
        }),
      ).toEqual({ kind: 'text', text: 'Bonjour,\n\n  Voici le devis.' });
    });

    it('should not turn markup in a text body into markup', () => {
      // Returned as text, so React renders a text node and it cannot become
      // an element.
      expect(
        readHermesMailboxBody({
          kind: 'text',
          text: '<script>alert(1)</script>',
        }),
      ).toEqual({ kind: 'text', text: '<script>alert(1)</script>' });
    });
  });

  describe('scripts and handlers', () => {
    it('should drop script elements', () => {
      const render = readHtml('<p>Devis joint.</p><script>alert(1)</script>');

      expect(htmlOf(render)).toContain('Devis joint.');
      expect(htmlOf(render)).not.toContain('alert');
    });

    it('should drop inline handlers, including without a leading space', () => {
      expect(htmlOf(readHtml('<div/onclick="alert(1)">x</div>'))).not.toContain(
        'onclick',
      );
    });

    it('should drop iframes', () => {
      expect(
        htmlOf(readHtml('<iframe src="https://x.example"></iframe>')),
      ).not.toContain('iframe');
    });
  });

  describe('images', () => {
    it('should not fetch a remote image the server left behind', () => {
      const render = readHtml('<img src="https://tracker.example/pixel.gif">');

      expect(htmlOf(render)).not.toContain('tracker.example');
      expect(htmlOf(render)).toContain('data-hermes-undisplayed-image="true"');
      expect(render.kind === 'html' && render.undisplayedImageCount).toBe(1);
    });

    it('should drop srcset too, so nothing is served from behind a blocked src', () => {
      expect(
        htmlOf(
          readHtml(
            '<img srcset="https://tracker.example/a.png 1x" src="https://tracker.example/b.png">',
          ),
        ),
      ).not.toContain('tracker.example');
    });

    it('should use a source the parent resolved for an embedded image', () => {
      const render = readHtml('<img src="cid:part1@mail">', [
        { contentId: 'part1@mail', resolvedSource: 'blob:nothing-remote' },
      ]);

      expect(htmlOf(render)).toContain('blob:nothing-remote');
      expect(render.kind === 'html' && render.undisplayedImageCount).toBe(0);
    });

    it('should refuse a resolved source that could reach the network', () => {
      const render = readHtml('<img src="cid:part1@mail">', [
        { contentId: 'part1@mail', resolvedSource: 'https://tracker.example/p.gif' },
      ]);

      expect(htmlOf(render)).not.toContain('tracker.example');
      expect(render.kind === 'html' && render.undisplayedImageCount).toBe(1);
    });

    it('should not display an embedded image the parent did not resolve', () => {
      const render = readHtml('<img src="cid:part9@mail">');

      expect(htmlOf(render)).not.toContain('cid:');
      expect(render.kind === 'html' && render.undisplayedImageCount).toBe(1);
    });
  });

  describe('navigation', () => {
    it('should keep an ordinary link and make it leave nothing behind', () => {
      const html = htmlOf(readHtml('<a href="https://client.example">Devis</a>'));

      expect(html).toContain('href="https://client.example"');
      expect(html).toContain('rel="noopener noreferrer nofollow"');
      expect(html).toContain('target="_blank"');
    });

    it('should drop a javascript: link', () => {
      // oxlint-disable-next-line no-script-url -- fixture for the blocklist
      expect(htmlOf(readHtml('<a href="javascript:alert(1)">x</a>'))).not.toContain(
        'href',
      );
    });

    it('should keep mailto and tel, which a correspondent legitimately sends', () => {
      const html = htmlOf(
        readHtml(
          '<a href="mailto:claire@client.example">write</a><a href="tel:+33123456789">call</a>',
        ),
      );

      expect(html).toContain('mailto:claire@client.example');
      expect(html).toContain('tel:+33123456789');
    });
  });

  describe('benign presentational markup', () => {
    it('should survive, because mail is laid out with tables', () => {
      const html = htmlOf(
        readHtml(
          '<table><tbody><tr><td style="padding: 8px"><strong>Total</strong></td></tr></tbody></table>',
        ),
      );

      expect(html).toContain('<table>');
      expect(html).toContain('padding: 8px');
      expect(html).toContain('<strong>Total</strong>');
    });
  });
});
