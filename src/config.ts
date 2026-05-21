import 'dotenv/config';
import type { AppConfig } from './types.js';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const lineReplyMode = env.LINE_REPLY_MODE === 'single_reply' ? 'single_reply' : 'two_step';

  return {
    port: parsePort(env.PORT),
    lineChannelSecret: required(env.LINE_CHANNEL_SECRET, 'LINE_CHANNEL_SECRET'),
    lineChannelAccessToken: required(env.LINE_CHANNEL_ACCESS_TOKEN, 'LINE_CHANNEL_ACCESS_TOKEN'),
    lineReplyMode,
    openaiApiKey: required(env.OPENAI_API_KEY, 'OPENAI_API_KEY'),
    openaiTranscriptionModel: env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe',
    openaiTextModel: env.OPENAI_TEXT_MODEL ?? 'gpt-5.2',
    firebaseStorageBucket: env.FIREBASE_STORAGE_BUCKET,
    storeAudio: env.STORE_AUDIO === 'true'
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return port;
}
