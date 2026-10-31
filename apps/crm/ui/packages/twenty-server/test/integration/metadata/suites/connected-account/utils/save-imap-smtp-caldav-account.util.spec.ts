import { makeMetadataApiRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

import { saveImapSmtpCaldavAccount } from './save-imap-smtp-caldav-account.util';

jest.mock(
  'test/integration/metadata/suites/utils/make-metadata-api-request.util',
  () => ({
    makeMetadataApiRequest: jest.fn(async () => ({
      body: {
        data: {
          saveImapSmtpCaldavAccount: {
            success: true,
            connectedAccountId: 'fixture-account',
          },
        },
      },
    })),
  }),
);

const input = {
  handle: 'operator@fixture.test',
  connectionParameters: {},
};

describe('mailbox setup request identity', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['company-a-token', 'company-b-token', null])(
    'preserves an explicitly selected identity: %s',
    async (token) => {
      await saveImapSmtpCaldavAccount({ input, expectToFail: false, token });

      expect(makeMetadataApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ variables: input }),
        token,
      );
    },
  );

  it('keeps the existing default identity only when the token is omitted', async () => {
    await saveImapSmtpCaldavAccount({ input, expectToFail: false });

    expect(makeMetadataApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ variables: input }),
    );
  });

  it('rejects undefined instead of falling back to another user', async () => {
    await expect(
      saveImapSmtpCaldavAccount({
        input,
        expectToFail: false,
        token: undefined,
      }),
    ).rejects.toThrow('authentication token cannot be undefined');

    expect(makeMetadataApiRequest).not.toHaveBeenCalled();
  });
});
