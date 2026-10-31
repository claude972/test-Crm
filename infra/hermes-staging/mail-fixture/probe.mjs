import assert from 'node:assert/strict';
import tls from 'node:tls';
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { readPlan } from './config.mjs';
const directory = process.env.KOVAALABCRM_MAIL_FIXTURE_PRIVATE_DIR;
const plan = readPlan(directory);
const credentials = JSON.parse(readFileSync(`${directory}/credentials.json`, 'utf8'));
const ca = readFileSync(`${directory}/ca.pem`);
async function channel(port, options = {}) {
  const socket = tls.connect({ host: plan.hostname, port, servername: plan.hostname, ca, rejectUnauthorized: true, minVersion: 'TLSv1.2', ...options });
  socket.setTimeout(5000, () => socket.destroy(new Error('protocol timeout')));
  let buffer = '', waiter, failure;
  const queue = [];
  const fail = (error) => { failure = error; waiter?.reject(error); waiter = undefined; };
  socket.on('error', fail); socket.on('close', () => fail(new Error('closed')));
  socket.on('data', (data) => {
    buffer += data.toString('utf8');
    if (buffer.length > 128 * 1024) { socket.destroy(); return; }
    while (buffer.includes('\r\n')) {
      const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (waiter) { const ready = waiter; waiter = undefined; ready.resolve(line); } else queue.push(line);
    }
  });
  await new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); });
  assert.equal(socket.authorized, true);
  return {
    line: () => queue.length ? Promise.resolve(queue.shift()) : failure ? Promise.reject(failure) : new Promise((resolve, reject) => { assert.ok(!waiter); waiter = { resolve, reject }; }),
    send: (value) => socket.write(`${value}\r\n`), close: () => socket.destroy(),
  };
}
async function imap(client, tag, command) {
  client.send(`${tag} ${command}`); const lines = [];
  for (let i = 0; i < 1000; i++) {
    const line = await client.line();
    if (line.startsWith(`${tag} `)) { assert.ok(line.startsWith(`${tag} OK`), 'IMAP refused'); return lines.join('\r\n'); }
    lines.push(line);
  }
  throw new Error('response limit');
}
async function response(client, code) {
  for (let i = 0; i < 100; i++) { const line = await client.line(); assert.ok(line.startsWith(`${code}`)); if (line[3] === ' ') return; assert.equal(line[3], '-'); }
  throw new Error('response limit');
}
async function denied(port, options) {
  await assert.rejects(channel(port, options).then((client) => { client.close(); return Promise.resolve(); }));
}
const checks = {};
try {
  for (const port of [plan.imaps, plan.smtps]) {
    await denied(port, { ca: [] });
    await denied(port, { servername: `wrong-${plan.id}.test` });
    await denied(port, { host: `absent-${plan.id}.test` });
  }
  checks.wrongCaSniHostRejected = true;
  for (const user of plan.users) {
    const client = await channel(plan.imaps);
    try {
      assert.match(await client.line(), /^\* OK /);
      await assert.rejects(imap(client, 'x001', `LOGIN "${user}" "invalid-password"`));
      await imap(client, 'x002', `LOGIN "${user}" "${credentials[user]}"`);
      const listed = await imap(client, 'x003', 'LIST "" "*"');
      for (const [i, folder] of ['Drafts', 'Sent', 'Trash'].entries()) if (!listed.includes(`"${folder}"`)) await imap(client, `c00${i}`, `CREATE "${folder}"`);
      const folders = await imap(client, 'x004', 'LIST "" "*"');
      for (const folder of ['Drafts', 'Sent', 'Trash']) assert.ok(folders.includes(`"${folder}"`));
      const raw = `From: ${user}@${plan.hostname}\r\nTo: ${user}@${plan.hostname}\r\nSubject: isolated-draft\r\n\r\nsynthetic only\r\n`;
      client.send(`x005 APPEND "Drafts" (\\Draft) {${Buffer.byteLength(raw)}}`);
      assert.match(await client.line(), /^\+/); client.send(raw);
      for (let i = 0; i < 100; i++) { const line = await client.line(); if (line.startsWith('x005 ')) { assert.ok(line.startsWith('x005 OK')); break; } assert.ok(i < 99); }
      const selected = await imap(client, 'x006', 'SELECT "Drafts"'); assert.match(selected, /UIDVALIDITY \d+/);
      const draft = await imap(client, 'x007', 'FETCH 1 (UID FLAGS RFC822.SIZE BODY.PEEK[])');
      assert.ok(draft.includes(raw)); assert.match(draft, /\\Draft/); assert.ok(draft.includes(`RFC822.SIZE ${Buffer.byteLength(raw)}`));
    } finally { client.close(); }
  }
  checks.authFoldersDraftMime = true;
  const marker = `synthetic-${randomBytes(8).toString('hex')}`;
  const smtp = await channel(plan.smtps);
  try {
    await response(smtp, 220); smtp.send('EHLO isolated.test'); await response(smtp, 250);
    smtp.send(`AUTH PLAIN ${Buffer.from('\0operator\0invalid-password').toString('base64')}`); await response(smtp, 535);
    smtp.send(`AUTH PLAIN ${Buffer.from(`\0operator\0${credentials.operator}`).toString('base64')}`); await response(smtp, 235);
    smtp.send(`MAIL FROM:<operator@${plan.hostname}>`); await response(smtp, 250);
    smtp.send(`RCPT TO:<ada@${plan.hostname}>`); await response(smtp, 250);
    smtp.send('DATA'); await response(smtp, 354);
    smtp.send(`From: operator@${plan.hostname}\r\nTo: ada@${plan.hostname}\r\nSubject: ${marker}\r\nMessage-ID: <${marker}@${plan.hostname}>\r\n\r\n${marker}\r\n.`); await response(smtp, 250);
  } finally { smtp.close(); }
  const inbox = await channel(plan.imaps);
  try {
    await inbox.line(); await imap(inbox, 'r001', `LOGIN "ada" "${credentials.ada}"`);
    assert.match(await imap(inbox, 'r002', 'SELECT INBOX'), /UIDVALIDITY \d+/);
    const mime = await imap(inbox, 'r003', 'FETCH 1 (UID RFC822.SIZE BODY.PEEK[])');
    assert.ok(mime.includes(marker)); assert.match(mime, /\bUID \d+/);
    const literal = mime.match(/\{(\d+)\}\r\n/), size = mime.match(/RFC822\.SIZE (\d+)/);
    assert.ok(literal && size); assert.equal(Number(literal[1]), Number(size[1]));
  } finally { inbox.close(); }
  checks.authSmtpImapCapture = true;
  await new Promise((resolve, reject) => {
    const socket = net.connect({ host: '1.1.1.1', port: 443 });
    socket.setTimeout(1500, () => { socket.destroy(); resolve(); });
    socket.once('connect', () => { socket.destroy(); reject(new Error('unexpected egress')); });
    socket.once('error', () => resolve());
  });
  checks.noWan = true;
  console.info(JSON.stringify({ mode: 'isolated-capture-only', checks }));
} catch { console.error('Isolated mail protocol probe failed; private details withheld'); process.exitCode = 1; }
