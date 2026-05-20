import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateLineSignature } from '../src/signature.js';

describe('validateLineSignature', () => {
  it('accepts a valid LINE signature for the raw body', () => {
    const rawBody = Buffer.from(JSON.stringify({ events: [] }));
    const secret = 'channel-secret';
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

    expect(validateLineSignature(rawBody, secret, signature)).toBe(true);
  });

  it('rejects a signature generated from a different body', () => {
    const rawBody = Buffer.from('{"events":[]}');
    const secret = 'channel-secret';
    const signature = crypto.createHmac('sha256', secret).update(Buffer.from('{"events":[1]}')).digest('base64');

    expect(validateLineSignature(rawBody, secret, signature)).toBe(false);
  });
});
