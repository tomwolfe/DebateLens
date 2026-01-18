/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, env, TextStreamer } from '@huggingface/transformers';

// Skip local model check
env.allowLocalModels = false;
env.useBrowserCache = true;

// Check for WebGPU support
async function checkWebGPU() {
  if (!(navigator as any).gpu) {
    throw new Error('WebGPU is not supported in this browser.');
  }
  const adapter = await (navigator as any).gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No appropriate GPU adapter found.');
  }
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
      dtype: 'q4', // 4-bit quantization for Phi-3
      progress_callback,
    }).then(instance => {
      this.llmInstance = instance;
      return instance;
    });

    return this.llmPromise;
  }
}

// Priority Queue: Transcriptions take priority over Fact-checks
const transcriptionQueue: { data: any }[] = [];
const factCheckQueue: { data: any }[] = [];
let isProcessing = false;
const MAX_FACT_CHECK_QUEUE_SIZE = 2;

async function processQueue() {
  if (isProcessing) return;
  
  let type: 'transcribe' | 'fact-check' | null = null;
  let item: any = null;

  if (transcriptionQueue.length > 0) {
    type = 'transcribe';
    item = transcriptionQueue.shift();
  } else if (factCheckQueue.length > 0) {
    type = 'fact-check';
    item = factCheckQueue.shift();
  }

  if (!type || !item) return;
  
  isProcessing = true;
  const { data } = item;

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
      
      const prompt = `<|system|>
You are a real-time fact-checker. Analyze the following text and determine if it contains a verifiable factual claim.
- If it is NOT a factual claim (e.g., greeting, opinion, fragment, filler), start your response with [NOT_A_CLAIM].
- If it IS a factual claim, start your response with [VERDICT] followed by True, False, or Unverified, then a 1-sentence explanation.

Example 1: "Hello how are you?" -> [NOT_A_CLAIM]
Example 2: "The moon is made of cheese." -> [VERDICT] False. The moon is composed of rock and metal.
Example 3: "I think we should go." -> [NOT_A_CLAIM]

Format: [VERDICT] {Verdict} {Explanation} or [NOT_A_CLAIM]<|end|>
<|user|>
"${data.text}"<|end|>
<|assistant|>`;

      let fullResponse = '';
      const streamer = new TextStreamer(llm.tokenizer, {
        skip_prompt: true,
        callback_function: (text: string) => {
          fullResponse += text;
          
          // Early exit if we detect NOT_A_CLAIM
          if (fullResponse.includes('[NOT_A_CLAIM]')) {
            self.postMessage({ 
              status: 'fact-check-stream', 
              text: 'NOT_A_CLAIM', 
              id: data.id,
              isDone: true 
            });
            return;
          }

          self.postMessage({ 
            status: 'fact-check-stream', 
            text: fullResponse, 
            id: data.id,
            isDone: false 
          });
        },
      });

      await llm(prompt, {
        max_new_tokens: 100,
        temperature: 0,
        do_sample: false,
        streamer,
      });

      if (!fullResponse.includes('[NOT_A_CLAIM]')) {
        self.postMessage({ 
          status: 'fact-check-stream', 
          text: fullResponse, 
          id: data.id, 
          isDone: true 
        });
      }
    }
  } catch (error: any) {
    console.error(`Error in worker (${type}):`, error);
    self.postMessage({ status: 'error', error: error.message, id: data.id, task: type });
  } finally {
    isProcessing = false;
    // Process next item in the next tick
    setTimeout(processQueue, 0);
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
      await checkWebGPU();
      await InferencePipeline.getSTT(reportProgress('stt'));
      await InferencePipeline.getLLM(reportProgress('llm'));
      self.postMessage({ status: 'ready' });
    } catch (error: any) {
      self.postMessage({ status: 'error', error: error.message });
    }
  } else if (type === 'transcribe') {
    transcriptionQueue.push({ data });
    processQueue();
  } else if (type === 'fact-check') {
    // Leaky queue for fact-checks only
    if (factCheckQueue.length >= MAX_FACT_CHECK_QUEUE_SIZE) {
      factCheckQueue.shift();
    }
    factCheckQueue.push({ data });
    processQueue();
  }
};

