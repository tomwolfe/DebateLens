export type WorkerMessageType = 'load' | 'transcribe' | 'fact-check';

export interface WorkerRequest {
  type: WorkerMessageType;
  data?: {
    audio?: Float32Array;
    text?: string;
    id?: string;
    speaker?: 'A' | 'B';
  };
}

export type WorkerStatus = 'ready' | 'progress' | 'transcription' | 'fact-check-stream' | 'error';

export interface WorkerResponse {
  status: WorkerStatus;
  model?: 'stt' | 'llm';
  progress?: number;
  text?: string;
  id?: string;
  speaker?: 'A' | 'B';
  error?: string;
  isDone?: boolean;
  busy?: boolean;
  task?: 'transcribe' | 'fact-check';
}
