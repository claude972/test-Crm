import { type Readable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

import { z } from 'zod';

const envelopeSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.string(),
    result: z.unknown().optional(),
    error: z.unknown().optional(),
  })
  .passthrough();
const MAX_RESPONSE_BYTES = 128_000;

const readResult = (value: unknown, expectedId: string): unknown => {
  const envelope = envelopeSchema.parse(value);
  if (
    envelope.id !== expectedId ||
    Object.prototype.hasOwnProperty.call(envelope, 'method') ||
    Object.prototype.hasOwnProperty.call(envelope, 'error') ||
    !Object.prototype.hasOwnProperty.call(envelope, 'result')
  )
    throw new Error('Invalid MCP response');
  return envelope.result;
};

export const readHermesMcpRpcResult = async (
  stream: Readable,
  contentType: string,
  expectedId: string,
): Promise<unknown> => {
  const eventStream = contentType.split(';')[0].trim() === 'text/event-stream';
  if (!eventStream && contentType.split(';')[0].trim() !== 'application/json') {
    stream.destroy();
    throw new Error('Unsupported MCP response');
  }
  let size = 0;
  let pending = '';
  const decoder = new StringDecoder('utf8');
  try {
    for await (const chunk of stream) {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as string);
      size += bytes.length;
      if (size > MAX_RESPONSE_BYTES) throw new Error('MCP response limit');
      pending += decoder.write(bytes);
      if (eventStream) {
        pending = pending.replace(/\r\n/g, '\n');
        const events = pending.split('\n\n');
        pending = events.pop() ?? '';
        for (const event of events) {
          const data = event
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''))
            .join('\n');
          if (!data) continue;
          const parsed: unknown = JSON.parse(data);
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'id' in parsed &&
            parsed.id === expectedId
          )
            return readResult(parsed, expectedId);
        }
      }
    }
    if (eventStream) throw new Error('Missing MCP event result');
    pending += decoder.end();
    return readResult(JSON.parse(pending), expectedId);
  } finally {
    stream.destroy();
  }
};
