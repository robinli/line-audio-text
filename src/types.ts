export type TranscriptStatus = 'processing' | 'completed' | 'failed' | 'ignored';

export interface AppConfig {
  port: number;
  lineChannelSecret: string;
  lineChannelAccessToken: string;
  lineReplyMode: 'two_step' | 'single_reply';
  openaiApiKey: string;
  openaiTranscriptionModel: string;
  openaiTextModel: string;
  firebaseStorageBucket?: string;
  storeAudio: boolean;
}

export interface LineWebhookBody {
  destination?: string;
  events?: LineWebhookEvent[];
}

export interface LineWebhookEvent {
  type: string;
  mode?: string;
  timestamp?: number;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery?: boolean;
  };
  replyToken?: string;
  message?: {
    id?: string;
    type?: string;
    contentProvider?: {
      type?: string;
    };
  };
}

export interface TranscriptJobCreateInput {
  eventId: string;
  messageId: string;
  userId?: string;
  sourceType?: string;
  status: TranscriptStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptJobUpdateInput {
  status: TranscriptStatus;
  transcript?: string;
  rawTranscriptText?: string;
  formattedTranscriptText?: string;
  errorMessage?: string;
  formatErrorMessage?: string;
  audioStoragePath?: string;
  completedAt?: Date;
  failedAt?: Date;
  updatedAt: Date;
}

export interface TranscriptJobsRepository {
  createJob(input: TranscriptJobCreateInput): Promise<string>;
  updateJob(jobId: string, input: TranscriptJobUpdateInput): Promise<void>;
}

export interface LineClient {
  replyText(replyToken: string, text: string): Promise<void>;
  pushText(to: string, text: string): Promise<void>;
  downloadMessageContent(messageId: string): Promise<Buffer>;
}

export interface AudioStorage {
  saveAudio(messageId: string, audio: Buffer, contentType: string): Promise<string>;
}

export interface Transcriber {
  transcribe(audio: Buffer, filename: string): Promise<string>;
}

export interface TranscriptFormatter {
  formatTranscriptText(rawText: string): Promise<string>;
}
