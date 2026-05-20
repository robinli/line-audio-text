import OpenAI, { toFile } from 'openai';
import type { Transcriber } from './types.js';

export class OpenAITranscriber implements Transcriber {
  private readonly client: OpenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audio: Buffer, filename: string): Promise<string> {
    const file = await toFile(audio, filename, { type: 'audio/mp4' });
    const result = await this.client.audio.transcriptions.create({
      file,
      model: this.model
    });

    if (!result.text) {
      throw new Error('OpenAI transcription returned empty text');
    }

    return result.text;
  }
}
