import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPlan } from './config.mjs';
import { providerRequest, newInstancePayload, webhookPayload, readPrivateOperator, savePrivateResult, qrBytes } from './client.mjs';
try {
  assert.notEqual(process.env.GITHUB_ACTIONS, 'true', 'Real association is operator-only');
  assert.equal(process.env.KOVAALABCRM_WA_OPERATOR_CONFIRM, 'true');
  const directory = process.env.KOVAALABCRM_WA_PRIVATE_DIR;
  const plan = readPlan(directory), keys = readPrivateOperator(directory), ca = readFileSync(`${directory}/ca.pem`);
  const call = (key, method, route, body) => providerRequest(plan, key, method, route, body, { ca });
  const action = process.argv[2];
  if (action === 'create') {
    await call(keys.globalKey, 'POST', '/instance/create', newInstancePayload(plan, keys.instanceToken));
    console.info('Dedicated unpaired WA instance created; no phone associated');
  } else if (action === 'status') {
    const response = await call(keys.instanceToken, 'GET', `/instance/connectionState/${plan.instanceName}`);
    assert.equal(response.instance?.instanceName, plan.instanceName);
    assert.ok(['open', 'close', 'connecting'].includes(response.instance.state));
    console.info(JSON.stringify({ providerState: response.instance.state, liveMessagesTested: false }));
  } else if (action === 'webhook') {
    const body = webhookPayload(plan, process.env.KOVAALABCRM_WA_CONNECTION_ID, keys.webhookSecret);
    await call(keys.instanceToken, 'POST', `/webhook/set/${plan.instanceName}`, body);
    const value = await call(keys.instanceToken, 'GET', `/webhook/find/${plan.instanceName}`);
    assert.equal(value.enabled, false); assert.equal(value.url, body.webhook.url); assert.equal(value.webhookByEvents, false);
    assert.equal(value.headers?.['x-hermes-evolution-token'], keys.webhookSecret);
    for (const event of body.webhook.events) assert.ok(value.events.includes(event));
    console.info('Connection-scoped webhook saved DISABLED; inbound activation requires a separately verified new-message filter');
  } else if (action === 'qr' || action === 'pair') {
    assert.equal(process.env.KOVAALABCRM_WA_BOTS_OFF_CONFIRMED, 'true');
    const webhook = await call(keys.instanceToken, 'GET', `/webhook/find/${plan.instanceName}`);
    assert.equal(webhook?.enabled, false, 'Initial association requires webhook disabled');
    let query = '';
    if (action === 'pair') {
      const input = readFileSync(0, 'utf8'); assert.ok(input.length <= 256);
      const number = JSON.parse(input).number; assert.match(number ?? '', /^[1-9][0-9]{7,14}$/);
      query = `?number=${number}`;
    }
    const value = await call(keys.instanceToken, 'GET', `/instance/connect/${plan.instanceName}${query}`);
    if (action === 'qr') savePrivateResult(process.env.KOVAALABCRM_WA_RESULT_FILE, qrBytes(value));
    else {
      const code = value.pairingCode ?? value.qrcode?.pairingCode;
      assert.match(code ?? '', /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/);
      savePrivateResult(process.env.KOVAALABCRM_WA_RESULT_FILE, JSON.stringify({ pairingCode: code }));
      if (process.env.KOVAALABCRM_WA_SHOW_PAIRING_CODE === 'true') { assert.equal(process.stdout.isTTY, true); console.info(code); }
    }
    console.info('Private association result saved; phone association and live message flow remain unproved');
  } else throw new Error('Unsupported operator action');
} catch { console.error('WA operator action refused; no phone, QR, token or provider response printed'); process.exitCode = 1; }
