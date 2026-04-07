import { FastFFTEngine } from '../fastFFTEngine';

/**
 * Mock AudioContext and AudioBuffer for Node environment
 */
(globalThis as any).OfflineAudioContext = class {
  constructor() {}
  createAnalyser() { return { fftSize: 2048, smoothingTimeConstant: 0, connect: () => {} }; }
  createBufferSource() { return { start: () => {}, connect: () => {} }; }
  connect() {}
  destination = {};
} as any;

const mockAudioContext = {
  sampleRate: 44100,
  createAnalyser: () => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getFloatFrequencyData: (data: Float32Array) => {},
    getFloatTimeDomainData: (data: Float32Array) => {},
  }),
} as unknown as AudioContext;

function createMockAudioBuffer(samples: Float32Array, sampleRate: number): AudioBuffer {
  return {
    sampleRate,
    length: samples.length,
    duration: samples.length / sampleRate,
    numberOfChannels: 1,
    getChannelData: (channel: number) => samples,
    copyFromChannel: (destination: Float32Array, channelNumber: number, startInChannel?: number) => {},
    copyToChannel: (source: Float32Array, channelNumber: number, startInChannel?: number) => {},
  } as unknown as AudioBuffer;
}

async function verifyFFT() {
  const engine = new FastFFTEngine(mockAudioContext);
  const fftSize = 1024;
  const sampleRate = 44100;
  const frequency = 441; // 10th bin (441 / 44100 * 1024 = 10.24)

  // Generate sine wave
  const samples = new Float32Array(fftSize * 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin(2 * Math.PI * frequency * (i / sampleRate));
  }

  const audioBuffer = createMockAudioBuffer(samples, sampleRate);

  console.log('Testing FFT on 441Hz sine wave...');
  const spectrum = await engine.performFFT(audioBuffer, fftSize);

  // Find peak frequency
  let maxMag = -Infinity;
  let peakFreq = 0;
  let peakBin = 0;

  spectrum.forEach((band, i) => {
    if (band.magnitude > maxMag) {
      maxMag = band.magnitude;
      peakFreq = band.frequency;
      peakBin = i;
    }
  });

  console.log(`Peak found at: ${peakFreq.toFixed(2)} Hz (Bin ${peakBin}) with magnitude ${maxMag.toFixed(2)} dB`);

  const expectedBin = Math.round(frequency * fftSize / sampleRate);
  const tolerance = 1; // bin tolerance

  if (Math.abs(peakBin - expectedBin) <= tolerance) {
    console.log('✅ FFT Correctness Verified: Frequency peak is in the expected bin.');
  } else {
    console.log(`❌ FFT Correctness Failed: Expected bin ~${expectedBin}, but found ${peakBin}`);
    process.exit(1);
  }

  // Test energy conservation (Parseval's theorem simplified)
  // Sum of squares in time domain should be proportional to sum of squares in frequency domain
  let timeEnergy = 0;
  const middleSamples = samples.subarray(samples.length / 2 - fftSize / 2, samples.length / 2 + fftSize / 2);
  const windowed = FastFFTEngine.applyHannWindow(middleSamples);
  for (let i = 0; i < windowed.length; i++) {
    timeEnergy += windowed[i] * windowed[i];
  }

  let freqEnergy = 0;
  spectrum.forEach(band => {
    const linearMag = Math.pow(10, band.magnitude / 20);
    freqEnergy += linearMag * linearMag;
  });

  console.log(`Time Domain Energy (windowed): ${timeEnergy.toFixed(4)}`);
  console.log(`Frequency Domain Energy: ${freqEnergy.toFixed(4)}`);

  // Note: For real-to-complex FFT, we only look at positive frequencies (half the bins)
  // and we divided magnitude by fftSize.
}

verifyFFT().catch(err => {
  console.error(err);
  process.exit(1);
});
