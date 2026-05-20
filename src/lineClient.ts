import type { LineClient } from './types.js';

export class LineHttpClient implements LineClient {
  constructor(private readonly channelAccessToken: string) {}

  async replyText(replyToken: string, text: string): Promise<void> {
    await this.postJson('https://api.line.me/v2/bot/message/reply', {
      replyToken,
      messages: [{ type: 'text', text: truncateLineText(text) }]
    });
  }

  async pushText(to: string, text: string): Promise<void> {
    await this.postJson('https://api.line.me/v2/bot/message/push', {
      to,
      messages: [{ type: 'text', text: truncateLineText(text) }]
    });
  }

  async downloadMessageContent(messageId: string): Promise<Buffer> {
    const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: {
        Authorization: `Bearer ${this.channelAccessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`LINE content download failed: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async postJson(url: string, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`LINE API request failed: ${response.status} ${response.statusText} ${responseBody}`);
    }
  }
}

function truncateLineText(text: string): string {
  return text.length > 5000 ? `${text.slice(0, 4990)}\n...(truncated)` : text;
}
