import { useMicVAD } from "@ricky0123/vad-react";

export function useAudioProcessor(
  onSpeechEnd: (audio: Float32Array) => void,
  deviceId?: string
) {
  const vad = useMicVAD({
    baseAssetPath: "/",
    onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/",
    model: "v5",
    // 500ms silence detection
    redemptionMs: 500,
    onSpeechEnd: (audio) => {
      onSpeechEnd(audio);
    },
    ...(deviceId ? { deviceId } : {}),
  });

  return {
    isRecording: !vad.loading && !vad.errored,
    vad,
  };
}
