import express, { type Request, type Response } from 'express';
import { validateLineSignature } from './signature.js';
import type {
  AppConfig,
  AudioStorage,
  LineClient,
  LineWebhookBody,
  LineWebhookEvent,
  Transcriber,
  TranscriptJobsRepository
} from './types.js';

export interface AppDependencies {
  config: AppConfig;
  lineClient: LineClient;
  jobs: TranscriptJobsRepository;
  transcriber: Transcriber;
  audioStorage?: AudioStorage;
}

export function createApp(deps: AppDependencies): express.Express {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  app.post('/webhook', express.raw({ type: 'application/json', limit: '25mb' }), async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = req.header('x-line-signature');

    if (!validateLineSignature(rawBody, deps.config.lineChannelSecret, signature)) {
      res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid LINE signature' } });
      return;
    }

    let body: LineWebhookBody;
    try {
      body = JSON.parse(rawBody.toString('utf8')) as LineWebhookBody;
    } catch {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
      return;
    }

    const events = Array.isArray(body.events) ? body.events : [];

    if (deps.config.lineReplyMode === 'two_step') {
      await Promise.all(events.map((event) => acknowledgeAudioEvent(event, deps.lineClient)));
      res.status(200).json({ ok: true });
      void Promise.all(events.map((event) => processEvent(event, deps, 'push'))).catch((error: unknown) => {
        console.error('Background webhook processing failed', error);
      });
      return;
    }

    await Promise.all(events.map((event) => processEvent(event, deps, 'reply')));
    res.status(200).json({ ok: true });
  });

  return app;
}

async function acknowledgeAudioEvent(event: LineWebhookEvent, lineClient: LineClient): Promise<void> {
  if (isAudioMessageEvent(event) && event.replyToken) {
    await lineClient.replyText(event.replyToken, '收到音訊，正在轉錄中。');
  }
}

async function processEvent(event: LineWebhookEvent, deps: AppDependencies, responseMode: 'reply' | 'push'): Promise<void> {
  if (!isAudioMessageEvent(event)) {
    return;
  }

  const messageId = event.message.id;
  const now = new Date();
  const jobId = await deps.jobs.createJob({
    eventId: event.webhookEventId ?? messageId,
    messageId,
    userId: event.source?.userId,
    sourceType: event.source?.type,
    status: 'processing',
    createdAt: now,
    updatedAt: now
  });

  try {
    const audio = await deps.lineClient.downloadMessageContent(messageId);
    const audioStoragePath =
      deps.config.storeAudio && deps.audioStorage ? await deps.audioStorage.saveAudio(messageId, audio, 'audio/mp4') : undefined;
    const transcript = await deps.transcriber.transcribe(audio, `${messageId}.m4a`);

    await deps.jobs.updateJob(jobId, {
      status: 'completed',
      transcript,
      audioStoragePath,
      completedAt: new Date(),
      updatedAt: new Date()
    });

    await sendResult(event, deps.lineClient, responseMode, transcript);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
    await deps.jobs.updateJob(jobId, {
      status: 'failed',
      errorMessage,
      failedAt: new Date(),
      updatedAt: new Date()
    });

    await sendResult(event, deps.lineClient, responseMode, `轉錄失敗，請稍後再試。\n${errorMessage}`);
  }
}

async function sendResult(event: LineWebhookEvent, lineClient: LineClient, responseMode: 'reply' | 'push', text: string): Promise<void> {
  if (responseMode === 'reply' && event.replyToken) {
    await lineClient.replyText(event.replyToken, text);
    return;
  }

  if (event.source?.userId) {
    await lineClient.pushText(event.source.userId, text);
  }
}

function isAudioMessageEvent(event: LineWebhookEvent): event is LineWebhookEvent & { message: { id: string; type: 'audio' } } {
  return event.type === 'message' && event.message?.type === 'audio' && typeof event.message.id === 'string';
}
