/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, env, TextStreamer } from '@huggingface/transformers';
import { WorkerRequest, WorkerResponse } from '../types/worker-messages';

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
const MAX_FACT_CHECK_QUEUE_SIZE = 10;

/**
 * Validates and normalizes the fact-check response from the LLM.
 * This acts as a 'Logic Regression' safety net.
 */
function validateFactCheckResponse(response: string): string {
  if (response.includes('[NOT_A_CLAIM]')) {
    return 'NOT_A_CLAIM';
  }

  // Ensure the response at least starts with [VERDICT] or looks like one
  const hasVerdict = /\[VERDICT\]|\[True\]|\[False\]|\[Unverified\]|True:|False:|Unverified:/i.test(response);
  
  if (!hasVerdict && response.length > 0) {
    // If it's generating text but hasn't emitted a verdict token, we let it continue
    // but the main thread will handle partials.
    return response;
  }

  return response;
}

function postToMain(msg: WorkerResponse) {
  self.postMessage(msg);
}

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

  if (!type || !item) {
    postToMain({ status: 'ready', busy: false });
    return;
  }
  
  isProcessing = true;
  postToMain({ status: 'ready', busy: true });
  const { data } = item;

  try {
    if (type === 'transcribe') {
      const stt = await InferencePipeline.getSTT();
      const output = await stt(data.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });
      postToMain({ status: 'transcription', text: output.text, id: data.id, speaker: data.speaker });
    } else if (type === 'fact-check') {
      const llm = await InferencePipeline.getLLM();
      
      const prompt = `<|system|>
You are a real-time fact-checker. Analyze the text and determine if it contains a verifiable factual claim.
- If it is NOT a factual claim (greeting, opinion, filler, command, question), response: [NOT_A_CLAIM]
- If it IS a factual claim, response: [VERDICT] {True|False|Unverified}. {1-sentence explanation}

STRICT RULES:
1. Start ONLY with [NOT_A_CLAIM] or [VERDICT].
2. Explanation must be concise.
3. Don't hallucinate; if unsure, use Unverified.

Examples:
- "The capital of France is Paris." -> [VERDICT] True. Paris is the capital and largest city of France.
- "What time is it?" -> [NOT_A_CLAIM]
- "The Earth is flat." -> [VERDICT] False. The Earth is an oblate spheroid.

Input text to analyze:
"${data.text}"<|end|>
<|user|>
Check the claim: "${data.text}"<|end|>
<|assistant|>`;

      let fullResponse = '';
      const streamer = new TextStreamer(llm.tokenizer, {
        skip_prompt: true,
        callback_function: (text: string) => {
          fullResponse += text;
          const validated = validateFactCheckResponse(fullResponse);
          
          if (validated === 'NOT_A_CLAIM') {
            postToMain({ 
              status: 'fact-check-stream', 
              text: 'NOT_A_CLAIM', 
              id: data.id,
              isDone: true 
            });
            return;
          }

          postToMain({ 
            status: 'fact-check-stream', 
            text: validated, 
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

      const finalValidated = validateFactCheckResponse(fullResponse);
      if (finalValidated !== 'NOT_A_CLAIM') {
        postToMain({ 
          status: 'fact-check-stream', 
          text: finalValidated, 
          id: data.id, 
          isDone: true 
        });
      }
    }
  } catch (error: any) {
    console.error(`Error in worker (${type}):`, error);
    postToMain({ status: 'error', error: error.message, id: data.id, task: type || undefined });
  } finally {
    isProcessing = false;
    setTimeout(processQueue, 0);
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { type, data } = e.data;

  if (type === 'load') {
    const reportProgress = (model: 'stt' | 'llm') => (progress: any) => {
      if (progress.status === 'progress') {
        postToMain({ status: 'progress', model, progress: progress.progress });
      }
    };

    try {
      await checkWebGPU();
      await InferencePipeline.getSTT(reportProgress('stt'));
      await InferencePipeline.getLLM(reportProgress('llm'));
      postToMain({ status: 'ready' });
    } catch (error: any) {
      postToMain({ status: 'error', error: error.message });
    }
  } else if (type === 'transcribe' && data) {
    transcriptionQueue.push({ data });
    processQueue();
  } else if (type === 'fact-check' && data) {
    if (factCheckQueue.length >= MAX_FACT_CHECK_QUEUE_SIZE) {
      factCheckQueue.shift();
    }
    factCheckQueue.push({ data });
    processQueue();
  }
};