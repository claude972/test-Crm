// Provider-only runner smoke: real TLS/SMTP/IMAP, no CRM and no outside recipients.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { channel, imapCommand, STANDARD_FOLDERS } from './preview-mail-fixture-imap-p0.mjs';
import { fixturePlan, privateDirectory, PORTS } from './preview-mail-fixture-p0.mjs';

async function smtpResponse(connection, expected) {
  for (let count = 0; count < 100; count++) {
    const line = await connection.line();
    assert.ok(line.startsWith(String(expected)), 'Unexpected SMTP response');
    if (line[3] === ' ') return;
    assert.equal(line[3], '-');
  }
  throw new Error('Oversized SMTP reply');
}
async function smoke() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Provider smoke is runner-only');
  const plan = fixturePlan(process.env);
  assert.ok(plan);
  const ca = readFileSync(path.join(privateDirectory(process.env), 'ca.pem'));
  const marker = `hermes-isolated-${randomBytes(12).toString('hex')}`;
  const smtp = await channel(plan, ca, PORTS.smtps);
  try {
    await smtpResponse(smtp, 220);
    smtp.send('EHLO fixture.test'); await smtpResponse(smtp, 250);
    smtp.send(`AUTH PLAIN ${Buffer.from(`\0operator\0${plan.password}`).toString('base64')}`);
    await smtpResponse(smtp, 235);
    smtp.send(`MAIL FROM:<operator@${plan.domain}>`); await smtpResponse(smtp, 250);
    smtp.send(`RCPT TO:<ada@${plan.domain}>`); await smtpResponse(smtp, 250);
    smtp.send('DATA'); await smtpResponse(smtp, 354);
    smtp.send(`From: operator@${plan.domain}\r\nTo: ada@${plan.domain}\r\nSubject: ${marker}\r\nMessage-ID: <${marker}@${plan.domain}>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${marker}\r\n.`);
    await smtpResponse(smtp, 250);
    smtp.send('QUIT'); await smtpResponse(smtp, 221);
  } finally { smtp.close(); }
  console.info('Isolated fixture: authenticated SMTPS accepted one synthetic .test message');
  const imap = await channel(plan, ca, PORTS.imaps);
  try {
    assert.match(await imap.line(), /^\* OK /);
    await imapCommand(imap, 'a001', `LOGIN "ada" "${plan.password}"`);
    await imapCommand(imap, 'a002', 'SELECT INBOX');
    const search = await imapCommand(imap, 'a003', 'SEARCH ALL');
    assert.match(search, /^\* SEARCH 1(?:\r\n|$)/);
    const received = await imapCommand(imap, 'a004', 'FETCH 1 BODY.PEEK[]');
    assert.ok(received.includes(`Subject: ${marker}`), 'Stored MIME subject must match submitted message');
    assert.ok(received.includes(marker), 'Stored MIME body must contain the synthetic marker');
    assert.ok(received.includes(`ada@${plan.domain}`), 'Recipient mailbox must match');
    const summary = await imapCommand(imap, 'a005', 'UID FETCH 1 (UID RFC822.SIZE)');
    const partial = await imapCommand(imap, 'a006', 'UID FETCH 1 (UID BODY.PEEK[]<0.37748737>)');
    const sourceLiteral = (response) => {
      const match = /\{(\d+)\}\r\n/.exec(response);
      assert.ok(match, 'IMAP source must contain one bounded literal');
      const length = Number(match[1]);
      assert.ok(Number.isSafeInteger(length) && length > 0 && length < 128 * 1024);
      const bytes = Buffer.from(response.slice(match.index + match[0].length), 'utf8').subarray(0, length);
      assert.equal(bytes.length, length);
      return bytes;
    };
    const fullBytes = sourceLiteral(received), partialBytes = sourceLiteral(partial);
    const size = Number(summary.match(/RFC822\.SIZE (\d+)/)?.[1]);
    const uid = Number(summary.match(/\bUID (\d+)/)?.[1]);
    assert.equal(uid, 1); assert.ok(Number.isSafeInteger(size));
    assert.deepEqual(partialBytes, fullBytes, 'A bounded partial fetch must retain the complete small fixture MIME');
    console.info(JSON.stringify({probe:'imap-source-size',uid,reportedSize:size,fullSourceLength:fullBytes.length,boundedSourceLength:partialBytes.length,strictSizeGuardWouldPass:size===partialBytes.length}));
    assert.equal(size, partialBytes.length, 'RFC822.SIZE must match complete MIME bytes for the native mailbox identity guard');

  } finally { imap.close(); }
  console.info('Isolated fixture: authenticated IMAPS read the captured MIME; CA/SAN validated on both protocols');
  for (const user of plan.users) {
    const client = await channel(plan, ca, PORTS.imaps);
    try {
      assert.match(await client.line(), /^\* OK /);
      await imapCommand(client, 'd001', `LOGIN "${user.login}" "${plan.password}"`);
      const listed = await imapCommand(client, 'd002', 'LIST "" "*"');
      for (const folder of STANDARD_FOLDERS)
        assert.ok(listed.split('\r\n').some(line => line.startsWith('* LIST ') && line.endsWith(`"${folder}"`)), 'Every fixture mailbox needs standard folders');
      const raw = `From: ${user.email}\r\nTo: ${user.email}\r\nSubject: isolated-draft\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nisolated draft only\r\n`;
      const byteLength = Buffer.byteLength(raw);
      client.send(`d003 APPEND "Drafts" (\\Draft) {${byteLength}}`);
      assert.match(await client.line(), /^\+/);
      client.send(raw);
      // Consume APPEND completion without logging MIME, credentials or recipient.
      let appended = false;
      for (let count = 0; count < 100; count++) {
        const line = await client.line();
        if (line.startsWith('d003 ')) { assert.match(line, /^d003 OK/); appended = true; break; }
      }
      assert.ok(appended);
      const selected = await imapCommand(client, 'd004', 'SELECT "Drafts"');
      assert.match(selected, /UIDVALIDITY \d+/);
      const fetched = await imapCommand(client, 'd005', 'UID FETCH 1 (UID FLAGS RFC822.SIZE BODY.PEEK[])');
      assert.match(fetched, /\bUID 1\b/);
      assert.ok(fetched.includes('\\Draft'));
      assert.ok(fetched.includes(raw), 'Draft MIME must survive authenticated APPEND/fetch');
      const literalSize = Number(fetched.match(/\{(\d+)\}\r\n/)?.[1]);
      assert.equal(Number(fetched.match(/RFC822\.SIZE (\d+)/)?.[1]), literalSize);
      assert.equal(literalSize, byteLength);
    } finally { client.close(); }
  }
  console.info('Isolated fixture: all three synthetic mailboxes list Drafts/Sent/Trash and persist a flagged draft with matching MIME, UIDVALIDITY and RFC822.SIZE');

}
async function verifyCleanup() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true');
  const plan = fixturePlan(process.env);
  assert.ok(plan);
  assert.equal(existsSync(privateDirectory(process.env)), false, 'Private fixture directory must be gone');
  assert.ok(!readFileSync('/etc/hosts', 'utf8').includes(`# hermes-isolated-mail-${plan.id}`));
  for (const args of [['inspect', plan.name], ['network', 'inspect', plan.network]]) {
    assert.throws(() => execFileSync('docker', args, { stdio: 'pipe', timeout: 5000 }), 'Fixture Docker resources must be gone');
  }
  for (const port of Object.values(PORTS)) {
    await new Promise((resolve, reject) => {
      const socket = net.connect({ host: '127.0.0.1', port });
      socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Cleanup probe timed out')); });
      socket.once('connect', () => { socket.destroy(); reject(new Error('Fixture loopback forwarding survived cleanup')); });
      socket.once('error', (error) => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
    });
  }
  console.info('Isolated fixture cleanup verified: no forwarders, Docker resources, host mapping or private files remain');
}
(process.argv[2] === 'after-cleanup' ? verifyCleanup() : smoke()).catch(() => { console.error('Isolated fixture SMTP/IMAP smoke failed; protocol details withheld to protect credentials'); process.exitCode = 1; });
