
// Benchmark script for FFT vs DFT performance
// Run with: npx ts-node lib/services/benchmarkFFT.ts

async function benchmark() {
  const fftSize = 8192;
  const samples = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) samples[i] = Math.random() * 2 - 1;

  console.log(`Benchmarking FFT vs DFT for size ${fftSize}...`);

  // 1. Naive DFT (Old Implementation)
  const startDFT = Date.now();
  const dftResult = [];
  for (let k = 0; k < fftSize / 2; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      real += samples[n] * Math.cos(angle);
      imag -= samples[n] * Math.sin(angle);
    }
    const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;
    dftResult.push(magnitude);
  }
  const endDFT = Date.now();
  const dftTime = endDFT - startDFT;
  console.log(`Old DFT implementation: ${dftTime}ms`);

  // 2. Cooley-Tukey FFT (New Implementation - Simulated logic from FastFFTEngine)
  function applyHannWindow(s: Float32Array): Float32Array {
    const windowed = new Float32Array(s.length);
    for (let i = 0; i < s.length; i++) {
      windowed[i] = s[i] * (0.5 * (1 - Math.cos((2 * Math.PI * i) / s.length)));
    }
    return windowed;
  }

  function cooleyTukeyFFT(s: Float32Array): Float32Array {
    const n = s.length;
    if (n <= 1) {
      const res = new Float32Array(2);
      res[0] = s[0];
      return res;
    }
    const even = new Float32Array(n / 2);
    const odd = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      even[i] = s[i * 2];
      odd[i] = s[i * 2 + 1];
    }
    const fftEven = cooleyTukeyFFT(even);
    const fftOdd = cooleyTukeyFFT(odd);
    const res = new Float32Array(n * 2);
    for (let k = 0; k < n / 2; k++) {
      const angle = -2 * Math.PI * k / n;
      const tReal = Math.cos(angle) * fftOdd[k * 2] - Math.sin(angle) * fftOdd[k * 2 + 1];
      const tImag = Math.sin(angle) * fftOdd[k * 2] + Math.cos(angle) * fftOdd[k * 2 + 1];
      res[k * 2] = fftEven[k * 2] + tReal;
      res[k * 2 + 1] = fftEven[k * 2 + 1] + tImag;
      res[(k + n / 2) * 2] = fftEven[k * 2] - tReal;
      res[(k + n / 2) * 2 + 1] = fftEven[k * 2 + 1] - tImag;
    }
    return res;
  }

  const startFFT = Date.now();
  const windowed = applyHannWindow(samples);
  const fftResult = cooleyTukeyFFT(windowed);
  const endFFT = Date.now();
  const fftTime = endFFT - startFFT;
  console.log(`New FFT implementation: ${fftTime}ms`);

  console.log(`---`);
  console.log(`Performance improvement: ${(dftTime / fftTime).toFixed(1)}x faster`);
  console.log(`Time saved per analysis call: ${dftTime - fftTime}ms`);
}

benchmark().catch(console.error);
