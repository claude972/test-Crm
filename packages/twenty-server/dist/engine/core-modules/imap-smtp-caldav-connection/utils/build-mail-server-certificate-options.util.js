"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMailServerCertificateOptions = buildMailServerCertificateOptions;
function buildMailServerCertificateOptions(provider) {
    return {
        port: 993,
        host: provider === 'gmail' ? 'imap.gmail.com' : 'outlook.office365.com',
    };
}
