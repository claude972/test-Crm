import { MessageImportDriverException, MessageImportDriverExceptionCode } from '../exceptions/message-import-driver.exception';

export function parseImapAuthenticationError(error: any): MessageImportDriverException {
  if (error.message?.includes('authentication')) {
    return new MessageImportDriverException(MessageImportDriverExceptionCode.IMAP_AUTH_FAILED, error.message);
  }
  return new MessageImportDriverException(MessageImportDriverExceptionCode.IMAP_CONNECTION_FAILED, error.message);
}
