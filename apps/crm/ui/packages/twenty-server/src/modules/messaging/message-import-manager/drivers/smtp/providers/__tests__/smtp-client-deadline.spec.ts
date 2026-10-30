import { createTransport } from 'nodemailer';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
}));
jest.mock(
  'src/engine/core-modules/secure-http-client/secure-http-client.service',
  () => ({ SecureHttpClientService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/connected-account/entities/connected-account.entity',
  () => ({ ConnectedAccountEntity: class {} }),
);
jest.mock(
  'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service',
  () => ({ ConnectedAccountTokenEncryptionService: class {} }),
);

const account = {
  id: 'account-fixture',
  workspaceId: 'workspace-fixture',
  provider: ConnectedAccountProvider.IMAP_SMTP_CALDAV,
  handle: 'sender@example.test',
  connectionParameters: { SMTP: { encrypted: true } },
};
const password = 'synthetic-password-not-for-logging';
const repository = { findOne: jest.fn() };
const secure = { getValidatedHost: jest.fn() };
const decrypt = { decryptProtocolPassword: jest.fn() };
const config = { get: jest.fn() };
const provider = new SmtpClientProvider(
  secure as never,
  config as never,
  decrypt as never,
  repository as never,
);

beforeEach(() => {
  jest.clearAllMocks();
  repository.findOne.mockResolvedValue(account);
  secure.getValidatedHost.mockResolvedValue('203.0.113.10');
  config.get.mockReturnValue(false);
  decrypt.decryptProtocolPassword.mockReturnValue({
    host: 'smtp.example.test',
    port: 587,
    connectionSecurity: 'STARTTLS',
    username: 'sender@example.test',
    password,
  });
});

test('keeps native defaults without deadline options', async () => {
  await provider.getClient(account.id);
  const options = jest.mocked(createTransport).mock.calls[0][0] as Record<
    string,
    unknown
  >;
  expect(options).not.toHaveProperty('connectionTimeout');
  expect(options).not.toHaveProperty('greetingTimeout');
  expect(options).not.toHaveProperty('socketTimeout');
});

test.each([1000, 15000, 30000])(
  'passes bounded %i ms deadline to the actual Nodemailer transport factory',
  async (timeoutMs) => {
    await provider.getClient(account.id, { timeoutMs });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: timeoutMs,
        greetingTimeout: timeoutMs,
        socketTimeout: timeoutMs,
        host: '203.0.113.10',
        secure: false,
        requireTLS: true,
        auth: { user: 'sender@example.test', pass: password },
        tls: { rejectUnauthorized: true, servername: 'smtp.example.test' },
      }),
    );
    expect(decrypt.decryptProtocolPassword).toHaveBeenCalledWith({
      protocolParams: account.connectionParameters.SMTP,
      workspaceId: account.workspaceId,
    });
    expect(secure.getValidatedHost).toHaveBeenCalledWith('smtp.example.test');
  },
);

test.each([
  null,
  {},
  { timeoutMs: 999 },
  { timeoutMs: 30001 },
  { timeoutMs: 1000.5 },
  { timeoutMs: NaN },
  { timeoutMs: Infinity },
  { timeoutMs: '15000' },
  { timeoutMs: 15000, password },
])(
  'rejects invalid deadline before account, credentials or network access',
  async (options) => {
    const error = await provider
      .getClient(account.id, options as never)
      .catch((value: Error) => value);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      'SMTP timeout must be an integer between 1000 and 30000 milliseconds',
    );
    expect((error as Error).message).not.toContain(password);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(decrypt.decryptProtocolPassword).not.toHaveBeenCalled();
    expect(secure.getValidatedHost).not.toHaveBeenCalled();
    expect(createTransport).not.toHaveBeenCalled();
  },
);
