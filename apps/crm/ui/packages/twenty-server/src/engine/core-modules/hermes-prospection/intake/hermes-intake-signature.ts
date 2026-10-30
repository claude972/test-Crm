import { createHmac, timingSafeEqual } from 'node:crypto';

export const HERMES_INTAKE_MAX_BODY_BYTES = 2_000_000;
export const HERMES_INTAKE_TTL_SECONDS = 300;

export const verifyHermesIntakeSignature = ({
  connectionId,
  timestamp,
  nonce,
  signature,
  body,
  secret,
  now,
}: {
  connectionId: string;
  timestamp: string;
  nonce: string;
  signature: string;
  body: Buffer;
  secret: string;
  now: number;
}): boolean => {
  if (
    !/^\d{10}$/.test(timestamp) ||
    !/^[a-f0-9-]{36}$/i.test(connectionId) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      nonce,
    ) ||
    !/^v1=[a-f0-9]{64}$/.test(signature) ||
    body.length > HERMES_INTAKE_MAX_BODY_BYTES ||
    Math.abs(Math.floor(now / 1000) - Number(timestamp)) >
      HERMES_INTAKE_TTL_SECONDS
  )
    return false;
  const expected = createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`v1\n${connectionId}\n${timestamp}\n${nonce}\n`)
    .update(body)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(3), 'hex'));
};
