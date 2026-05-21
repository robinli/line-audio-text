import { beforeEach, describe, expect, it, vi } from 'vitest';

const openAiMocks = vi.hoisted(() => ({
  responsesCreate: vi.fn(),
  audioTranscriptionsCreate: vi.fn(),
  toFile: vi.fn()
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: openAiMocks.audioTranscriptionsCreate
      }
    },
    responses: {
      create: openAiMocks.responsesCreate
    }
  })),
  toFile: openAiMocks.toFile
}));

describe('OpenAITranscriptFormatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats transcript text with the configured OpenAI text model', async () => {
    const { OpenAITranscriptFormatter } = await import('../src/openaiTranscriber.js');
    openAiMocks.responsesCreate.mockResolvedValue({
      output_text: '  今天來聊一下 OpenAI 跟 LINE 語音。\n'
    });
    const formatter = new OpenAITranscriptFormatter('openai-key', 'gpt-5.2');

    const result = await formatter.formatTranscriptText('今天來聊一下 open ai 跟 line 語音');

    expect(openAiMocks.responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.2',
        input: '今天來聊一下 open ai 跟 line 語音',
        instructions: expect.stringContaining('輸出只能是整理後文字，不要加說明')
      })
    );
    expect(result).toBe('今天來聊一下 OpenAI 跟 LINE 語音。');
  });

  it('throws when OpenAI returns empty formatted text', async () => {
    const { OpenAITranscriptFormatter } = await import('../src/openaiTranscriber.js');
    openAiMocks.responsesCreate.mockResolvedValue({
      output_text: '   '
    });
    const formatter = new OpenAITranscriptFormatter('openai-key', 'gpt-5.2');

    await expect(formatter.formatTranscriptText('原始逐字稿')).rejects.toThrow('OpenAI transcript formatting returned empty text');
  });
});
