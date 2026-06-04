
import { AdvancedKeyDetection } from '../advancedKeyDetection';

// Define AudioBuffer globally for the service
class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array[];

  constructor({ numberOfChannels, length, sampleRate }: any) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channelData = Array(numberOfChannels).fill(0).map(() => new Float32Array(length));
  }

  getChannelData(ch: number) { return this.channelData[ch]; }
}

(global as any).AudioBuffer = MockAudioBuffer;

async function verifyOptimization() {
  console.log('⚡ Bolt: Verifying AdvancedKeyDetection Performance...');

  const mockAudioContext = {
    sampleRate: 44100,
    createBuffer: (channels: number, length: number, sampleRate: number) =>
      new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate })
  } as any;

  // Mock window and AudioContext globally for the service
  (global as any).window = { AudioContext: function() { return mockAudioContext; } };

  const detector = new AdvancedKeyDetection(mockAudioContext);

  // Create a 120-second mock buffer (60 segments)
  const sampleRate = 44100;
  const duration = 120;
  const length = sampleRate * duration;
  const buffer = mockAudioContext.createBuffer(1, length, sampleRate);

  console.log('Running optimized detectChordProgression for 120s track (60 segments)...');
  const start = Date.now();
  const chords = await detector.detectChordProgression(buffer, 2);
  const end = Date.now();

  console.log(`Detected ${chords.length} chords in ${end - start}ms.`);
}

verifyOptimization().catch(console.error);
