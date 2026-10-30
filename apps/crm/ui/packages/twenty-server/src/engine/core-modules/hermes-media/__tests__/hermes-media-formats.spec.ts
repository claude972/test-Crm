import { extractFileInfoOrThrow } from 'src/engine/core-modules/file/utils/extract-file-info-or-throw.utils';
import { prepareMediaSchema } from '../hermes-media.policy';

// Isolated SWC test runner lacks the application's Lingui macro transform.
jest.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray) => strings.join(''),
}));

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3GQAAAAASUVORK5CYII=',
  'base64',
);
describe('Hermes formats use the actual native magic-byte parser', () => {
  it('recognizes real PNG bytes independently of an untrusted filename', async () => {
    expect(
      await extractFileInfoOrThrow({ file: png, filename: 'spoofed.jpg' }),
    ).toMatchObject({ mimeType: 'image/png', ext: 'png' });
  });
  it.each([
    '<html><script>alert(1)</script></html>',
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  ])(
    'rejects active text disguised as a PNG at native completion',
    async (content) => {
      await expect(
        extractFileInfoOrThrow({
          file: Buffer.from(content),
          filename: 'unsafe.png',
        }),
      ).rejects.toThrow();
    },
  );
  it('rejects HTML/SVG/PDF images at the media allowlist even when a filename looks safe', () => {
    for (const mimeType of ['text/html', 'image/svg+xml', 'application/pdf']) {
      expect(
        prepareMediaSchema.safeParse({
          conversationId: 'd969ca4a-05fb-4f6f-a8e6-c1baf31e22f5',
          kind: 'IMAGE',
          filename: 'unsafe.png',
          mimeType,
          size: 64,
        }).success,
      ).toBe(false);
    }
  });
});
