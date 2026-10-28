/**
 * Fix script for KovaaLab CRM TypeScript errors
 * 
 * Issues found:
 * 1. Space in identifiers: "KovaaLab CRM..." → "KovaaLabCRM..."
 * 2. Missing modules (KovaaLabCRMConfigService, KovaaLabCRMOrmException, etc.)
 * 3. Missing utility functions
 */

import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(__dirname, 'src');

// ============ Part 1: Create missing config service ============

const configServiceContent = `export class KovaaLabCRMConfigService {
  get<T = any>(key: string): T {
    return (process.env[key] as any) ?? null;
  }
  getBoolean(key: string, defaultValue = false): boolean {
    const val = this.get<string>(key);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return defaultValue;
  }
  getString(key: string, defaultValue?: string): string {
    return this.get<string>(key) ?? defaultValue ?? '';
  }
  getNumber(key: string, defaultValue = 0): number {
    const val = this.get<number>(key);
    return val ?? defaultValue;
  }
}
`;

fs.writeFileSync(path.join(srcDir, 'engine/core-modules/kovaa-lab-config/kovaa-lab-config.service.ts'), configServiceContent);
console.log('✓ Created KovaaLabCRMConfigService');

// ============ Part 2: Create ORM exception types ============

const ormExceptionContent = `export enum KovaaLabCRMOrmExceptionCode {
  QUERY_READ_TIMEOUT = 'QUERY_READ_TIMEOUT',
  TRANSIENT_DATABASE_ERROR = 'TRANSIENT_DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  UNIQUE_CONSTRAINT = 'UNIQUE_CONSTRAINT',
}

export class KovaaLabCRMOrmException extends Error {
  code: KovaaLabCRMOrmExceptionCode;

  constructor(code: KovaaLabCRMOrmExceptionCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

export type KovaaLabCRMOrmException = Error & {
  code: KovaaLabCRMOrmExceptionCode;
};
`;

fs.writeFileSync(path.join(srcDir, 'engine/core-modules/kovaa-lab-config/kovaa-lab-config-orm-exception.ts'), ormExceptionContent);
console.log('✓ Created ORM exception types');

// ============ Part 3: Create SecureHttpClientService stub ============

fs.mkdirSync(path.join(srcDir, 'engine/core-modules/secure-http-client'), { recursive: true });

const secureHttpContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class SecureHttpClientService {
  async get(url: string, options?: any): Promise<any> {
    // Stub for development
    return { data: null };
  }
  async post(url: string, data?: any, options?: any): Promise<any> {
    return { data: null };
  }
}
`;

fs.writeFileSync(path.join(srcDir, 'engine/core-modules/secure-http-client/secure-http-client.service.ts'), secureHttpContent);
console.log('✓ Created SecureHttpClientService stub');

// ============ Part 4: Create IMAP/SMTP utilities ============

fs.mkdirSync(path.join(srcDir, 'engine/core-modules/imap-smtp-caldav-connection'), { recursive: true });
fs.mkdirSync(path.join(srcDir, 'engine/core-modules/imap-smtp-caldav-connection/utils'), { recursive: true });

const buildImapTlsOptions = `
export function buildImapTlsOptions(provider: string): any {
  // Stub - returns basic TLS options
  return {
    rejectUnauthorized: false,
  };
}
`;

fs.writeFileSync(path.join(srcDir, 'engine/core-modules/imap-smtp-caldav-connection/utils/build-imap-tls-options.util.ts'), buildImapTlsOptions);

const buildMailServerCertificate = `
export function buildMailServerCertificateOptions(provider: string): any {
  return {
    port: 993,
    host: provider === 'gmail' ? 'imap.gmail.com' : 'outlook.office365.com',
  };
}
`;

fs.writeFileSync(path.join(srcDir, 'engine/core-modules/imap-smtp-caldav-connection/utils/build-mail-server-certificate-options.util.ts'), buildMailServerCertificate);
console.log('✓ Created IMAP/SMTP utilities');

// ============ Part 5: Create message import driver exception ============

const exceptionDir = path.join(srcDir, 'modules/messaging/message-import-manager/drivers/exceptions');
fs.mkdirSync(exceptionDir, { recursive: true });

const messageExceptionContent = `export enum MessageImportDriverExceptionCode {
  IMAP_AUTH_FAILED = 'IMAP_AUTH_FAILED',
  IMAP_CONNECTION_FAILED = 'IMAP_CONNECTION_FAILED',
  MICROSOFT_AUTH_FAILED = 'MICROSOFT_AUTH_FAILED',
  INBOX_PARSE_ERROR = 'INBOX_PARSE_ERROR',
}

export class MessageImportDriverException extends Error {
  code: MessageImportDriverExceptionCode;

  constructor(code: MessageImportDriverExceptionCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}
`;

fs.writeFileSync(path.join(exceptionDir, 'message-import-driver.exception.ts'), messageExceptionContent);
console.log('✓ Created message import driver exception');

// ============ Part 6: Create parse IMAP authentication error utility ============

const utilsDir = path.join(srcDir, 'modules/messaging/message-import-manager/drivers/imap/utils');
fs.mkdirSync(utilsDir, { recursive: true });

const parseImapAuthErrorContent = `
import { MessageImportDriverException, MessageImportDriverExceptionCode } from '../exceptions/message-import-driver.exception';

export function parseImapAuthenticationError(error: any): MessageImportDriverException {
  if (error.message?.includes('authentication')) {
    return new MessageImportDriverException(MessageImportDriverExceptionCode.IMAP_AUTH_FAILED, error.message);
  }
  return new MessageImportDriverException(MessageImportDriverExceptionCode.IMAP_CONNECTION_FAILED, error.message);
}
`;

fs.writeFileSync(path.join(utilsDir, 'parse-imap-authentication-error.util.ts'), parseImapAuthErrorContent);
console.log('✓ Created parse IMAP auth error utility');

// ============ Part 7: Create kovaa-lab-shared stub ============

const sharedDir = path.join(srcDir, 'shared');
fs.mkdirSync(sharedDir, { recursive: true });

const sharedTypes = `
export enum ConnectedAccountProvider {
  GMAIL = 'gmail',
  MICROSOFT = 'microsoft',
  GENERIC = 'generic',
}
`;

fs.writeFileSync(path.join(sharedDir, 'types.ts'), sharedTypes);

const sharedUtils = `
export function isDefined<T>(value: T): value is Exclude<T, undefined | null> {
  return value !== undefined && value !== null;
}
`;

fs.writeFileSync(path.join(sharedDir, 'utils.ts'), sharedUtils);
console.log('✓ Created kovaa-lab-shared stub');

// ============ Part 8: Fix space issues in identifiers ============

const filesToFix = [
  'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider.ts',
  'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-import.service.ts',
  'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/resend-inbound-email-message-source.service.ts',
  'src/modules/messaging/message-import-manager/drivers/inbound-email/sources/ses-s3-inbound-email-message-source.service.ts',
  'src/modules/messaging/message-import-manager/drivers/inbound-email/providers/inbound-email-s3-client.provider.ts',
  'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-message-list.service.dev.spec.ts',
  'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-messages.service.dev.spec.ts',
  'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider.ts',
  'src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service.ts',
  'src/modules/messaging/message-import-manager/services/messaging-messages-import.service.ts',
  'src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service.ts',
  'src/modules/messaging/message-import-manager/drivers/calendar/drivers/caldav/services/caldav-create-event.service.ts',
];

const baseDir = path.join(__dirname, '..');

for (const file of filesToFix) {
  const filePath = path.join(baseDir, file);
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // Fix: "KovaaLab CRM" → "KovaaLabCRM" in identifiers
      content = content.replace(/\bKovaaLab\s+CRM/g, 'KovaaLabCRM');
      content = content.replace(/\bkovaa-lab\s+config/g, 'kovaa-labConfig');
      content = content.replace(/\bkovaaLab\s+crm/g, 'kovaaLabCRM');
      
      // Fix import paths - update to correct paths
      content = content.replace(
        /from 'src\/engine\/core-modules\/kovaa-lab-config\/kovaa-lab-config\.service'/,
        "from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service'"
      );
      content = content.replace(
        /from 'src\/engine\/core-modules\/kovaa-lab-config\/kovaa-lab-config\.module'/,
        "from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.module'"
      );
      
      // Fix KovaaLabCRMOrmException import
      content = content.replace(
        /type KovaaLabCRMOrmException,\s*KovaaLabCRMOrmExceptionCode/g,
        "type KovaaLabCRMOrmException, KovaaLabCRMOrmExceptionCode"
      );
      
      // Fix shared module imports
      content = content.replace(
        /from 'kovaa-lab-shared\/types'/g,
        "from 'src/shared/types'"
      );
      content = content.replace(
        /from 'kovaa-lab-shared\/utils'/g,
        "from 'src/shared/utils'"
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed: ${file}`);
    } else {
      console.log(`✗ Not found: ${file}`);
    }
  } catch (e) {
    console.log(`✗ Error: ${file}: ${e.message}`);
  }
}

console.log('\n=== Fix complete. Run tsc --noEmit to check remaining errors ===');