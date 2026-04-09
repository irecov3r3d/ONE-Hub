
import { FastFFTEngine } from '../fastFFTEngine';

// Mocking window and AudioContext for Node.js environment
class MockAudioContext {}

(globalThis as any).window = {};
(globalThis as any).AudioContext = MockAudioContext;

function verifyCorrectness() {
  const fftSize = 1024;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    // Complex signal: sum of two sine waves
    samples[i] = Math.sin(2 * Math.PI * 100 * i / 44100) + 0.5 * Math.sin(2 * Math.PI * 500 * i / 44100);
  }

  console.log(`🧪 Verifying FFT Correctness (size: ${fftSize})...`);

  // We compare the iterative in-place result with a known expected outcome
  // or properties (e.g. symmetry for real inputs, Parseval's theorem)

  const data = new Float32Array(fftSize * 2);
  for (let i = 0; i < fftSize; i++) {
    data[i * 2] = samples[i];
  }

  FastFFTEngine.iterativeInPlaceFFT(data);

  // 1. Check DC component (sum of samples)
  let expectedDC = 0;
  for (let i = 0; i < fftSize; i++) expectedDC += samples[i];
  const actualDC = data[0];

  if (Math.abs(expectedDC - actualDC) > 1e-3) {
    throw new Error(`DC component mismatch: expected ${expectedDC}, got ${actualDC}`);
  }
  console.log('✅ DC component OK');

  // 2. Check for conjugate symmetry (since input is real)
  // X[k] should be conjugate of X[N-k]
  for (let k = 1; k < fftSize / 2; k++) {
    const realK = data[k * 2];
    const imagK = data[k * 2 + 1];
    const realNK = data[(fftSize - k) * 2];
    const imagNK = data[(fftSize - k) * 2 + 1];

    if (Math.abs(realK - realNK) > 1e-4 || Math.abs(imagK + imagNK) > 1e-4) {
      throw new Error(`Conjugate symmetry violation at k=${k}`);
    }
  }
  console.log('✅ Conjugate symmetry OK');

  // 3. Check Parseval's theorem (sum of squares in time domain = sum of squares in freq domain / N)
  let timeEnergy = 0;
  for (let i = 0; i < fftSize; i++) timeEnergy += samples[i] * samples[i];

  let freqEnergy = 0;
  for (let i = 0; i < fftSize; i++) {
    freqEnergy += data[i * 2] * data[i * 2] + data[i * 2 + 1] * data[i * 2 + 1];
  }
  freqEnergy /= fftSize;

  if (Math.abs(timeEnergy - freqEnergy) > 1e-3) {
    throw new Error(`Parseval's theorem violation: timeEnergy ${timeEnergy}, freqEnergy ${freqEnergy}`);
  }
  console.log('✅ Parseval\'s theorem OK');

  console.log('\n✨ FFT CORRECTNESS VERIFIED! ✨');
}

verifyCorrectness();
