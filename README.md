# DebateLens

DebateLens is a real-time AI-powered fact-checking application that performs live speech recognition and fact verification directly in your browser using WebGPU acceleration. The application leverages cutting-edge machine learning models to transcribe speech and verify claims instantly, all without sending your data to external servers.

## Features

- **Real-time speech recognition**: Uses Whisper-Tiny model for automatic speech recognition
- **AI-powered fact checking**: Employs Phi-3 Mini language model for claim verification
- **Client-side processing**: All AI inference runs locally in your browser using WebGPU
- **Dual-speaker support**: Distinguish between Speaker A and Speaker B
- **Manual input option**: Submit text for fact-checking manually
- **Visual feedback**: Color-coded verdicts (True/False/Unverified) with explanations
- **Keyboard shortcuts**: Quick controls for speaker switching and toggling listening
- **Persistent storage**: Transcripts saved to localStorage

## Technology Stack

- **Framework**: Next.js 16 with React 19
- **AI Models**: Whisper-Tiny (speech recognition) and Phi-3 Mini (fact-checking)
- **Hardware Acceleration**: WebGPU for AI inference
- **UI Library**: Tailwind CSS with Framer Motion animations
- **Icons**: Lucide React
- **Audio Processing**: vad-react for voice activity detection
- **ML Framework**: Hugging Face Transformers.js running in web workers

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Prerequisites

- Modern browser with WebGPU support (Chrome 113+, Edge 113+)
- Microphone access for speech recognition
- First-time setup may take 1-3 minutes as AI models download (~2.5GB total)

## How It Works

1. **Audio Capture**: The app captures audio from your selected microphone
2. **Voice Activity Detection**: Identifies when someone is speaking
3. **Speech-to-Text**: Transcribes speech using the Whisper model
4. **Claim Verification**: Analyzes statements using the Phi-3 language model
5. **Results Display**: Shows verdicts (True/False/Unverified) with explanations

## Keyboard Shortcuts

- `1` - Switch to Speaker A
- `2` - Switch to Speaker B
- `Tab` - Toggle between speakers
- `M` - Mute/unmute microphone
- `Ctrl/Cmd+C` - Clear all transcripts

## Architecture

The application follows a client-side ML architecture:
- **Main Thread**: UI rendering and user interactions
- **Web Workers**: Isolated environment for AI inference to prevent UI blocking
- **WebGPU**: Hardware-accelerated ML computations
- **IndexedDB/LocalStorage**: Persistent storage for transcripts

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report

## Learn More

To learn more about the underlying technologies, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) - JavaScript library for running ML models in browsers
- [WebGPU Documentation](https://www.w3.org/TR/webgpu/) - Modern graphics and compute API for the web
- [Framer Motion](https://www.framer.com/motion/) - Production-ready motion library for React

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests to improve the functionality or fix bugs.

## License

This project is licensed under the terms described in the LICENSE file.
