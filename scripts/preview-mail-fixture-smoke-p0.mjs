// Provider-only runner smoke: real TLS/SMTP/IMAP, no CRM and no outside recipients.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import { fixturePlan, privateDirectory, PORTS } from './preview-mail-fixture-p0.mjs';

async function channel(plan, ca, port) {
  const socket = tls.connect({ host: '127.0.0.1', port, servername: plan.hostname, ca,
    rejectUnauthorized: true, minVersion: 'TLSv1.2' });
  let buffer = '';
  let failure;
  let waiting;
  const queue = [];
  const fail = (error) => { failure = error; waiting?.reject(error); waiting = undefined; };
  socket.on('data', (data) => {
    buffer += data.toString('utf8');
    if (buffer.length > 128 * 1024) return fail(new Error('Oversized fixture response'));
    for (;;) {
      const end = buffer.indexOf('\r\n');
      if (end < 0) break;
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (waiting) { const next = waiting; waiting = undefined; next.resolve(line); }
      else queue.push(line);
    }
  });
  socket.on('error', fail);
  socket.on('close', () => fail(new Error('Fixture connection ended')));
  socket.setTimeout(5000, () => socket.destroy(new Error('Fixture protocol timeout')));
  await new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); });
  assert.equal(socket.authorized, true);
  const line = () => {
    if (queue.length) return Promise.resolve(queue.shift());
    if (failure) return Promise.reject(failure);
    assert.ok(!waiting, 'Only one pending protocol read');
    return new Promise((resolve, reject) => { waiting = { resolve, reject }; });
  };
  return { line, send: (value) => socket.write(`${value}\r\n`), close: () => socket.destroy() };
}
async function smtpResponse(connection, expected) {
  for (let count = 0; count < 100; count++) {
    const line = await connection.line();
    assert.ok(line.startsWith(String(expected)), 'Unexpected SMTP response');
    if (line[3] === ' ') return;
    assert.equal(line[3], '-');
  }
  throw new Error('Oversized SMTP reply');
}
async function imapCommand(connection, tag, command) {
  connection.send(`${tag} ${command}`);
  const lines = [];
  for (let count = 0; count < 1000; count++) {
    const line = await connection.line();
    if (line.startsWith(`${tag} `)) {
      assert.ok(line.startsWith(`${tag} OK`), 'IMAP command refused');
      return lines.join('\r\n');
    }
    lines.push(line);
  }
  throw new Error('Oversized IMAP reply');
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
  } finally { imap.close(); }
  console.info('Isolated fixture: authenticated IMAPS read the captured MIME; CA/SAN validated on both protocols');
}
smoke().catch(() => { console.error('Isolated fixture SMTP/IMAP smoke failed; protocol details withheld to protect credentials'); process.exitCode = 1; });
