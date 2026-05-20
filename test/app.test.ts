import crypto from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig, LineWebhookBody } from '../src/types.js';

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 3000,
    lineChannelSecret: 'channel-secret',
    lineChannelAccessToken: 'line-token',
    lineReplyMode: 'single_reply',
    openaiApiKey: 'openai-key',
    openaiTranscriptionModel: 'gpt-4o-mini-transcribe',
    storeAudio: false,
    ...overrides
  };
}

function sign(rawBody: Buffer): string {
  return crypto.createHmac('sha256', 'channel-secret').update(rawBody).digest('base64');
}

describe('createApp', () => {
  it('returns health status', async () => {
    const app = createApp({
      config: makeConfig(),
      lineClient: {
        replyText: vi.fn(),
        pushText: vi.fn(),
        downloadMessageContent: vi.fn()
      },
      jobs: {
        createJob: vi.fn(),
        updateJob: vi.fn()
      },
      transcriber: {
        transcribe: vi.fn()
      }
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('rejects webhook requests with an invalid LINE signature', async () => {
    const app = createApp({
      config: makeConfig(),
      lineClient: {
        replyText: vi.fn(),
        pushText: vi.fn(),
        downloadMessageContent: vi.fn()
      },
      jobs: {
        createJob: vi.fn(),
        updateJob: vi.fn()
      },
      transcriber: {
        transcribe: vi.fn()
      }
    });

    const response = await request(app)
      .post('/webhook')
      .set('x-line-signature', 'invalid')
      .send({ events: [] });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('downloads audio, transcribes it, stores the completed job, and replies with transcript', async () => {
    const body: LineWebhookBody = {
      events: [
        {
          type: 'message',
          webhookEventId: 'event-1',
          replyToken: 'reply-token',
          source: { type: 'user', userId: 'user-1' },
          message: { id: 'message-1', type: 'audio' }
        }
      ]
    };
    const rawBodyText = JSON.stringify(body);
    const rawBody = Buffer.from(rawBodyText);
    const lineClient = {
      replyText: vi.fn().mockResolvedValue(undefined),
      pushText: vi.fn().mockResolvedValue(undefined),
      downloadMessageContent: vi.fn().mockResolvedValue(Buffer.from('audio'))
    };
    const jobs = {
      createJob: vi.fn().mockResolvedValue('job-1'),
      updateJob: vi.fn().mockResolvedValue(undefined)
    };
    const transcriber = {
      transcribe: vi.fn().mockResolvedValue('逐字稿內容')
    };
    const app = createApp({
      config: makeConfig(),
      lineClient,
      jobs,
      transcriber
    });

    const response = await request(app)
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-line-signature', sign(rawBody))
      .send(rawBodyText);

    expect(response.status).toBe(200);
    expect(lineClient.downloadMessageContent).toHaveBeenCalledWith('message-1');
    expect(transcriber.transcribe).toHaveBeenCalledWith(Buffer.from('audio'), 'message-1.m4a');
    expect(jobs.createJob).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing', messageId: 'message-1' }));
    expect(jobs.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({ status: 'completed', transcript: '逐字稿內容' }));
    expect(lineClient.replyText).toHaveBeenCalledWith('reply-token', '逐字稿內容');
  });

  it('marks the Firestore job failed when transcription fails', async () => {
    const body: LineWebhookBody = {
      events: [
        {
          type: 'message',
          webhookEventId: 'event-1',
          replyToken: 'reply-token',
          source: { type: 'user', userId: 'user-1' },
          message: { id: 'message-1', type: 'audio' }
        }
      ]
    };
    const rawBodyText = JSON.stringify(body);
    const rawBody = Buffer.from(rawBodyText);
    const lineClient = {
      replyText: vi.fn().mockResolvedValue(undefined),
      pushText: vi.fn().mockResolvedValue(undefined),
      downloadMessageContent: vi.fn().mockResolvedValue(Buffer.from('audio'))
    };
    const jobs = {
      createJob: vi.fn().mockResolvedValue('job-1'),
      updateJob: vi.fn().mockResolvedValue(undefined)
    };
    const transcriber = {
      transcribe: vi.fn().mockRejectedValue(new Error('OpenAI failed'))
    };
    const app = createApp({
      config: makeConfig(),
      lineClient,
      jobs,
      transcriber
    });

    const response = await request(app)
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-line-signature', sign(rawBody))
      .send(rawBodyText);

    expect(response.status).toBe(200);
    expect(jobs.updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({ status: 'failed', errorMessage: 'OpenAI failed' }));
    expect(lineClient.replyText).toHaveBeenCalledWith('reply-token', expect.stringContaining('轉錄失敗'));
  });
});
