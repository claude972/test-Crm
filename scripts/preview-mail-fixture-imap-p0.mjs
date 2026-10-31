// Fixed loopback-only TLS protocol support for disposable synthetic mail fixtures.
import assert from 'node:assert/strict';
import tls from 'node:tls';
export const STANDARD_FOLDERS = Object.freeze(['Drafts', 'Sent', 'Trash']);
export async function channel(plan, ca, port) {
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
export async function imapCommand(connection, tag, command) {
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

export function assertFolderFixture(plan) {
  assert.match(plan.id ?? '', /^\d{1,20}-\d{1,5}$/);
  assert.equal(plan.hostname, `mail-fixture-${plan.id}.test`);
  assert.equal(plan.domain, plan.hostname);
  assert.equal(plan.mode, 'isolated-capture-only');
  assert.match(plan.password ?? '', /^[a-f0-9]{64}$/);
  assert.deepEqual(plan.users, ['operator', 'ada', 'grace'].map(login => ({login, email: `${login}@${plan.hostname}`})));
  assert.ok(Date.parse(plan.expiresAt) > Date.now(), 'Fixture session must remain active');
}
export async function initializeStandardFolders(plan, ca) {
  assertFolderFixture(plan);
  for (const user of plan.users) {
    const client = await channel(plan, ca, 3993);
    try {
      assert.match(await client.line(), /^\* OK /);
      await imapCommand(client, 'f001', `LOGIN "${user.login}" "${plan.password}"`);
      for (const [index, folder] of STANDARD_FOLDERS.entries())
        await imapCommand(client, `f00${index + 2}`, `CREATE "${folder}"`);
      const listed = await imapCommand(client, 'f005', 'LIST "" "*"');
      for (const folder of STANDARD_FOLDERS)
        assert.ok(listed.split('\r\n').some(line => line.startsWith('* LIST ') && line.endsWith(`"${folder}"`)), 'Synthetic standard folder must exist');
      await imapCommand(client, 'f006', 'LOGOUT');
    } finally { client.close(); }
  }
}
