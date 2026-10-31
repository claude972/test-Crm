import { compileCampaignEmailContent } from 'src/modules/emailing/utils/compile-campaign-email-content.util';

// Only the HTML stringifier is stubbed, exactly as this folder's own
// compile-campaign-email-content spec does. The canonical parse gate and the
// real variable binding both run, and the bound document is what is asserted.
jest.mock(
  'src/engine/core-modules/email/utils/compile-outbound-email-content.util',
  () => ({
    compileOutboundEmailContent: jest.fn().mockResolvedValue({
      html: '<p>rendered html</p>',
      plainText: 'rendered html',
    }),
  }),
);

const { compileOutboundEmailContent } = jest.requireMock(
  'src/engine/core-modules/email/utils/compile-outbound-email-content.util',
);

// Written verbatim by the real campaign body editor. Captured from the
// twenty-front round-trip test of HermesCampaignContentSection, which asserts
// this same canonical gate; regenerate it from there if the editor changes.
const WRITTEN_BODY_TEMPLATE =
  '{"type":"doc","attrs":{"canvasTheme":{"pageBackground":"#ffffff","pagePadding":"24px","textAlign":"left","bodyBackground":"","textColor":"#333333","width":"600px","padding":"24px","cornerRadius":"0px","borderWidth":"0px","borderColor":""},"schemaVersion":1},"content":[{"type":"paragraph","attrs":{"style":null},"content":[{"type":"text","text":"Bonjour {{fullName}}, dossier {{personId}}."}]}]}';

const ADA = { fullName: 'Ada Lovelace', personId: 'person-ada' };
const GRACE = { fullName: 'Grace Hopper', personId: 'person-grace' };

const compileFor = async (variables: Record<string, string>) => {
  compileOutboundEmailContent.mockClear();
  await compileCampaignEmailContent(WRITTEN_BODY_TEMPLATE, variables);

  return JSON.stringify(compileOutboundEmailContent.mock.calls[0][0]);
};

describe('campaign body round trip', () => {
  it('compiles the bodyTemplate the editor actually wrote', async () => {
    await expect(
      compileCampaignEmailContent(WRITTEN_BODY_TEMPLATE, ADA),
    ).resolves.toEqual(
      expect.objectContaining({ html: expect.any(String) }),
    );
  });

  it('substitutes a different value for each recipient', async () => {
    const forAda = await compileFor(ADA);
    const forGrace = await compileFor(GRACE);

    expect(forAda).toContain('Ada Lovelace');
    expect(forAda).toContain('person-ada');
    expect(forAda).not.toContain('Grace Hopper');

    expect(forGrace).toContain('Grace Hopper');
    expect(forGrace).toContain('person-grace');
    expect(forGrace).not.toContain('Ada Lovelace');

    // A body that compiles but substitutes nothing would pass a static check
    // and fail the first real campaign.
    expect(forAda).not.toEqual(forGrace);
    expect(forAda).not.toContain('{{fullName}}');
    expect(forGrace).not.toContain('{{personId}}');
  });

  it('refuses the plain prose the free textarea used to persist', async () => {
    await expect(
      compileCampaignEmailContent('Bonjour {{fullName}}, dossier.', ADA),
    ).rejects.toThrow(
      /not a renderable email document/,
    );
  });
});
