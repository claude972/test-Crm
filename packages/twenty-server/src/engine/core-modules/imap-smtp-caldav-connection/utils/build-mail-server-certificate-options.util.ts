export function buildMailServerCertificateOptions(provider: string): any {
  return {
    port: 993,
    host: provider === 'gmail' ? 'imap.gmail.com' : 'outlook.office365.com',
  };
}
