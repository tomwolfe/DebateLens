/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, env, TextStreamer } from '@huggingface/transformers';

// Skip local model check
env.allowLocalModels = false;
env.useBrowserCache = true;

// Memory optimization
if (env.backends?.onnx?.wasm) {
  (env.backends.onnx.wasm as any).numThreads = 1;
}

class InferencePipeline {
  static sttInstance: any = null;
  static llmInstance: any = null;
  static sttPromise: Promise<any> | null = null;
  static llmPromise: Promise<any> | null = null;

  static async getSTT(progress_callback?: (progress: any) => void) {
    if (this.sttInstance) return this.sttInstance;
    if (this.sttPromise) return this.sttPromise;

    this.sttPromise = pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
      device: 'webgpu',
      dtype: 'fp32',
      progress_callback,
    }).then(instance => {
      this.sttInstance = instance;
      return instance;
    });

    return this.sttPromise;
  }

  static async getLLM(progress_callback?: (progress: any) => void) {
    if (this.llmInstance) return this.llmInstance;
    if (this.llmPromise) return this.llmPromise;

    this.llmPromise = pipeline('text-generation', 'Xenova/Phi-3-mini-4k-instruct', {
      device: 'webgpu',
      dtype: 'q4',
      progress_callback,
    }).then(instance => {
      this.llmInstance = instance;
      return instance;
    });

    return this.llmPromise;
  }
}

// Leaky queue to prevent GPU thrashing and maintain real-time feel
const queue: { type: string; data: any }[] = [];
let isProcessing = false;
const MAX_QUEUE_SIZE = 3;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const { type, data } = queue.shift()!;

  try {
    if (type === 'transcribe') {
      const stt = await InferencePipeline.getSTT();
      const output = await stt(data.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });
      self.postMessage({ status: 'transcription', text: output.text, id: data.id, speaker: data.speaker });
    } else if (type === 'fact-check') {
      const llm = await InferencePipeline.getLLM();
      
      // STEP A: CLASSIFICATION
      const classificationPrompt = `<|system|>
You are a classifier. Determine if the text contains a "verifiable factual claim".
Respond ONLY with "YES" or "NO".<|end|>
<|user|>
${data.text}<|end|>
<|assistant|>`;

      const classificationResult = await llm(classificationPrompt, {
        max_new_tokens: 5,
        temperature: 0,
        do_sample: false,
      });

      const isClaim = classificationResult[0].generated_text.toUpperCase().includes('YES');

      if (!isClaim) {
        self.postMessage({ 
          status: 'fact-check-stream', 
          text: 'NOT_A_CLAIM', 
          id: data.id, 
          isDone: true 
        });
        isProcessing = false;
        processQueue();
        return;
      }

      // STEP B: FACT-CHECK
      const factCheckPrompt = `<|system|>
You are a real-time fact-checker. Provide a verdict (True, False, or Unverified) and a brief 1-sentence explanation.
Format: [VERDICT] | [EXPLANATION]<|end|>
<|user|>
${data.text}<|end|>
<|assistant|>`;

      let fullResponse = '';
      const streamer = new TextStreamer(llm.tokenizer, {
        skip_prompt: true,
        callback_function: (text: string) => {
          fullResponse += text;
          self.postMessage({ 
            status: 'fact-check-stream', 
            text: fullResponse, 
            id: data.id,
            isDone: false 
          });
        },
      });

      await llm(factCheckPrompt, {
        max_new_tokens: 128,
        temperature: 0,
        do_sample: false,
        streamer,
      });

      self.postMessage({ 
        status: 'fact-check-stream', 
        text: fullResponse, 
        id: data.id, 
        isDone: true 
      });
    }
  } catch (error: any) {
    self.postMessage({ status: 'error', error: error.message, id: data.id, task: type });
  } finally {
    isProcessing = false;
    processQueue();
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'load') {
    const reportProgress = (model: 'stt' | 'llm') => (progress: any) => {
      if (progress.status === 'progress') {
        self.postMessage({ status: 'progress', model, progress: progress.progress });
      }
    };

    try {
      await InferencePipeline.getSTT(reportProgress('stt'));
      await InferencePipeline.getLLM(reportProgress('llm'));
      self.postMessage({ status: 'ready' });
    } catch (error: any) {
      self.postMessage({ status: 'error', error: error.message });
    }
  } else {
    // Leaky queue logic for fact-checks
    if (type === 'fact-check') {
      // If queue is too long, remove the oldest fact-check
      const factCheckCount = queue.filter(q => q.type === 'fact-check').length;
      if (factCheckCount >= MAX_QUEUE_SIZE) {
        const index = queue.findIndex(q => q.type === 'fact-check');
        if (index !== -1) queue.splice(index, 1);
      }
    }
    
    queue.push({ type, data });
    processQueue();
  }
};

