/**
 * Optimized FFT (Fast Fourier Transform) Engine
 * Implements Cooley-Tukey algorithm for efficient frequency analysis
 */
export class FastFFTEngine {
  /**
   * Perform Forward FFT
   */
  static fft(real: Float32Array): { magnitude: Float32Array; phase: Float32Array } {
    const n = real.length;
    if ((n & (n - 1)) !== 0) {
      throw new Error('FFT size must be a power of 2');
    }

    const imag = new Float32Array(n);
    this.transform(real, imag);

    const half = n / 2;
    const magnitude = new Float32Array(half);
    const phase = new Float32Array(half);

    for (let i = 0; i < half; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      phase[i] = Math.atan2(imag[i], real[i]);
    }

    return { magnitude, phase };
  }

  /**
   * Cooley-Tukey FFT implementation
   */
  private static transform(real: Float32Array, imag: Float32Array): void {
    const n = real.length;
    if (n <= 1) return;

    // Bit-reversal permutation
    for (let i = 0, j = 0; i < n; i++) {
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
      let m = n >> 1;
      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }
      j += m;
    }

    // Iterative Cooley-Tukey
    for (let s = 2; s <= n; s <<= 1) {
      const m = s >> 1;
      const theta = (-2 * Math.PI) / s;
      const w_r = Math.cos(theta);
      const w_i = Math.sin(theta);

      for (let j = 0; j < n; j += s) {
        let wr = 1;
        let wi = 0;
        for (let k = 0; k < m; k++) {
          const r = real[j + k + m];
          const i = imag[j + k + m];
          const tr = wr * r - wi * i;
          const ti = wr * i + wi * r;

          real[j + k + m] = real[j + k] - tr;
          imag[j + k + m] = imag[j + k] - ti;
          real[j + k] += tr;
          imag[j + k] += ti;

          const next_wr = wr * w_r - wi * w_i;
          wi = wr * w_i + wi * w_r;
          wr = next_wr;
        }
      }
    }
  }

  /**
   * Calculate Power Spectral Density
   */
  static calculatePSD(samples: Float32Array): Float32Array {
    const { magnitude } = this.fft(samples);
    const psd = new Float32Array(magnitude.length);
    for (let i = 0; i < magnitude.length; i++) {
      psd[i] = (magnitude[i] * magnitude[i]) / samples.length;
    }
    return psd;
  }
}
