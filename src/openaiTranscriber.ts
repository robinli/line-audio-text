import OpenAI, { toFile } from 'openai';
import type { Transcriber, TranscriptFormatter } from './types.js';

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

export class OpenAITranscriptFormatter implements TranscriptFormatter {
  private readonly client: OpenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async formatTranscriptText(rawText: string): Promise<string> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: [
        '你是逐字稿格式化助手。請把 OpenAI Speech-to-Text 產生的 raw transcript 整理成繁體中文可讀版本。',
        '規則：加入適當標點符號；依語意自然分段；不改變原意；不新增資訊；不刪除重要內容；保留口語語氣。',
        '中英混合詞使用常見寫法，例如 AI、LINE、OpenAI、Codex。',
        '輸出只能是整理後文字，不要加說明。'
      ].join('\n'),
      input: rawText
    });
    const formattedText = response.output_text.trim();

    if (!formattedText) {
      throw new Error('OpenAI transcript formatting returned empty text');
    }

    return formattedText;
  }
}
