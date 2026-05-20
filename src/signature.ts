import crypto from 'node:crypto';

export function validateLineSignature(rawBody: Buffer, channelSecret: string, signature: string | undefined): boolean {
  if (!signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
