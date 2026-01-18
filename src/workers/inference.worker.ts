import { pipeline, env, TextStreamer } from '@huggingface/transformers';

// Skip local model check
env.allowLocalModels = false;
env.useBrowserCache = true;

// Memory optimization
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
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

// Simple queue to prevent GPU thrashing
const queue: { type: string; data: any }[] = [];
let isProcessing = false;

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
      self.postMessage({ status: 'transcription', text: output.text, id: data.id });
    } else if (type === 'fact-check') {
      const llm = await InferencePipeline.getLLM();
      
      const prompt = `<|system|>
You are a real-time fact-checker. Determine if the following statement contains a verifiable factual claim.
If it is NOT a factual claim (e.g., a greeting, an opinion, a question, or a vague statement), respond ONLY with "NOT_A_CLAIM".
If it IS a factual claim, provide a verdict (True, False, or Unverified) and a brief 1-sentence explanation.
Format: [VERDICT] | [EXPLANATION]
Maintain objectivity and focus on consensus facts.<|end|>
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

      await llm(prompt, {
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
    // Add to queue for transcription and fact-checking
    queue.push({ type, data });
    processQueue();
  }
};

