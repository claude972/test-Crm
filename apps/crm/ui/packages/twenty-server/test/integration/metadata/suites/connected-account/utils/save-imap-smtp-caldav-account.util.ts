import { gql } from 'graphql-tag';
import { makeMetadataApiRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

import { EmailConnectionSecurity } from 'src/engine/core-modules/imap-smtp-caldav-connection/enums/email-connection-security.enum';

type ProtocolConnectionInput = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  connectionSecurity?: EmailConnectionSecurity;
};

type SaveImapSmtpCaldavAccountInput = {
  handle: string;
  connectionParameters: {
    IMAP?: ProtocolConnectionInput;
    SMTP?: ProtocolConnectionInput;
    CALDAV?: ProtocolConnectionInput;
  };
  id?: string;
};

export const saveImapSmtpCaldavAccount = async (args: {
  input: SaveImapSmtpCaldavAccountInput;
  expectToFail: boolean;
  token?: string | null;
}) => {
  const { input, expectToFail } = args;
  const hasExplicitToken = 'token' in args;

  // Undefined would silently authenticate as the helper's default user.
  if (hasExplicitToken && args.token === undefined) {
    throw new Error(
      'An explicit mailbox authentication token cannot be undefined',
    );
  }

  const operation = {
    query: gql`
      mutation SaveImapSmtpCaldavAccount(
        $handle: String!
        $connectionParameters: EmailAccountConnectionParameters!
        $id: UUID
      ) {
        saveImapSmtpCaldavAccount(
          handle: $handle
          connectionParameters: $connectionParameters
          id: $id
        ) {
          success
          connectedAccountId
        }
      }
    `,
    variables: {
      handle: input.handle,
      connectionParameters: input.connectionParameters,
      ...(input.id && { id: input.id }),
    },
  };

  const response = await (hasExplicitToken
    ? makeMetadataApiRequest(operation, args.token)
    : makeMetadataApiRequest(operation));

  if (expectToFail) {
    expect(response.body.errors).toBeDefined();

    return { errors: response.body.errors, data: null };
  }

  expect(response.body.errors).toBeUndefined();

  return { errors: null, data: response.body.data.saveImapSmtpCaldavAccount };
};
