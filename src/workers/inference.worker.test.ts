import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @huggingface/transformers
vi.mock('@huggingface/transformers', () => {
  return {
    pipeline: vi.fn(),
    env: {
      allowLocalModels: true,
      useBrowserCache: true,
    },
    TextStreamer: vi.fn().mockImplementation(function(tokenizer, options) {
      this.tokenizer = tokenizer;
      this.options = options;
    }),
  };
});

import { pipeline } from '@huggingface/transformers';

describe('inference.worker', () => {
  let mockPostMessage: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPostMessage = vi.fn();
    
    // Create a mock self that we can track
    const mockSelf = {
      postMessage: mockPostMessage,
      onmessage: null as any,
    };
    
    vi.stubGlobal('self', mockSelf);
    vi.stubGlobal('navigator', {
        gpu: {
            requestAdapter: vi.fn().mockResolvedValue({})
        }
    });

    // Import the worker which should assign self.onmessage
    await import('./inference.worker');
  });

  const waitForPostMessage = (status: string) => {
    return vi.waitFor(() => {
        const calls = mockPostMessage.mock.calls;
        const found = calls.find((call: any) => call[0].status === status);
        if (!found) throw new Error(`Status ${status} not found in calls`);
    }, { timeout: 1000 });
  };

  it('should handle load message', async () => {
    const mockSTT = vi.fn();
    const mockLLM = vi.fn();
    (pipeline as any).mockImplementation((type: string) => {
      if (type === 'automatic-speech-recognition') return Promise.resolve(mockSTT);
      if (type === 'text-generation') return Promise.resolve(mockLLM);
    });

    const event = {
      data: { type: 'load' }
    } as MessageEvent;

    // Trigger the onmessage handler
    await (self as any).onmessage(event);

    await waitForPostMessage('ready');
  });

  it('should handle transcribe message', async () => {
    const mockSTT = vi.fn().mockResolvedValue({ text: 'Hello world' });
    (pipeline as any).mockImplementation((type: string) => {
        if (type === 'automatic-speech-recognition') return Promise.resolve(mockSTT);
        return Promise.resolve(vi.fn());
    });

    const event = {
      data: { type: 'transcribe', data: { audio: new Float32Array([0]), id: '123', speaker: 'A' } }
    } as MessageEvent;

    await (self as any).onmessage(event);

    await waitForPostMessage('transcription');

    expect(mockPostMessage).toHaveBeenCalledWith({
      status: 'transcription',
      text: 'Hello world',
      id: '123',
      speaker: 'A'
    });
  });

  it('should handle fact-check message', async () => {
    const mockLLM = vi.fn().mockImplementation(async (prompt, options) => {
      if (options.streamer) {
        options.streamer.options.callback_function('[VERDICT] True: This is a test.');
      }
      return [{ generated_text: '[VERDICT] True: This is a test.' }];
    });
    
    (pipeline as any).mockImplementation((type: string) => {
        if (type === 'text-generation') return Promise.resolve(mockLLM);
        return Promise.resolve(vi.fn());
    });

    const event = {
      data: { type: 'fact-check', data: { text: 'Statement', id: '123' } }
    } as MessageEvent;

    await (self as any).onmessage(event);

    await waitForPostMessage('fact-check-stream');

    expect(mockLLM).toHaveBeenCalled();
    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
      status: 'fact-check-stream',
      id: '123',
      text: expect.stringContaining('VERDICT')
    }));
  });

  it('should handle non-claim fact-check message', async () => {
    const mockLLM = vi.fn().mockImplementation(async (prompt, options) => {
      if (options.streamer) {
        options.streamer.options.callback_function('[NOT_A_CLAIM]');
      }
      return [{ generated_text: '[NOT_A_CLAIM]' }];
    });

    (pipeline as any).mockImplementation((type: string) => {
        if (type === 'text-generation') return Promise.resolve(mockLLM);
        return Promise.resolve(vi.fn());
    });

    const event = {
      data: { type: 'fact-check', data: { text: 'Hello', id: '123' } }
    } as MessageEvent;

    await (self as any).onmessage(event);

    await waitForPostMessage('fact-check-stream');

    expect(mockPostMessage).toHaveBeenCalledWith({
      status: 'fact-check-stream',
      text: 'NOT_A_CLAIM',
      id: '123',
      isDone: true
    });
  });

  it('should handle errors', async () => {
    (pipeline as any).mockRejectedValue(new Error('Failed to load'));

    const event = {
      data: { type: 'load' }
    } as MessageEvent;

    await (self as any).onmessage(event);

    await waitForPostMessage('error');

    expect(mockPostMessage).toHaveBeenCalledWith({
      status: 'error',
      error: 'Failed to load'
    });
  });
});
