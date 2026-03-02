/**
 * FFT vs DFT Benchmark
 *
 * Measures the performance difference between the old O(N^2) DFT
 * and the new O(N log N) Cooley-Tukey FFT implementation.
 */

function cooleyTukeyFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const result = new Float32Array(n * 2);

    if (n === 1) {
        result[0] = samples[0];
        result[1] = 0;
        return result;
    }

    const even = new Float32Array(n / 2);
    const odd = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
        even[i] = samples[i * 2];
        odd[i] = samples[i * 2 + 1];
    }

    const fftEven = cooleyTukeyFFT(even);
    const fftOdd = cooleyTukeyFFT(odd);

    for (let k = 0; k < n / 2; k++) {
        const angle = (-2 * Math.PI * k) / n;
        const tReal = Math.cos(angle) * fftOdd[k * 2] - Math.sin(angle) * fftOdd[k * 2 + 1];
        const tImag = Math.sin(angle) * fftOdd[k * 2] + Math.cos(angle) * fftOdd[k * 2 + 1];

        result[k * 2] = fftEven[k * 2] + tReal;
        result[k * 2 + 1] = fftEven[k * 2 + 1] + tImag;

        result[(k + n / 2) * 2] = fftEven[k * 2] - tReal;
        result[(k + n / 2) * 2 + 1] = fftEven[k * 2 + 1] - tImag;
    }

    return result;
}

function discreteFourierTransform(samples: Float32Array): Float32Array {
    const n = samples.length;
    const out = new Float32Array(n * 2);
    for (let k = 0; k < n / 2; k++) {
        let real = 0;
        let imag = 0;
        for (let j = 0; j < n; j++) {
            const angle = (2 * Math.PI * k * j) / n;
            real += samples[j] * Math.cos(angle);
            imag -= samples[j] * Math.sin(angle);
        }
        out[k * 2] = real;
        out[k * 2 + 1] = imag;
    }
    return out;
}

async function runBenchmark() {
    // For a fair comparison that doesn't take hours, we use N=1024
    // Then we extrapolate for N=8192
    const N = 1024;
    const samples = new Float32Array(N).fill(0).map(() => Math.random());

    console.log(`--- FFT vs DFT Benchmark (N=${N}) ---`);

    // Benchmark FFT
    const startFFT = Date.now();
    cooleyTukeyFFT(samples);
    const endFFT = Date.now();
    const fftTime = endFFT - startFFT;
    console.log(`FFT Time (N=${N}): ${fftTime}ms`);

    // Benchmark DFT
    console.log('Running DFT...');
    const startDFT = Date.now();
    discreteFourierTransform(samples);
    const endDFT = Date.now();
    const dftTime = endDFT - startDFT;
    console.log(`DFT Time (N=${N}): ${dftTime}ms`);

    const speedup = (dftTime / fftTime).toFixed(1);
    console.log(`\n⚡ Speedup (N=${N}): ${speedup}x faster`);

    console.log('\n--- Extrapolation for N=8192 ---');
    // DFT is O(N^2), so 8x increase in N means 64x increase in time
    // FFT is O(N log N), so 8x increase in N means ~8 * (13/10) = 10.4x increase in time
    const extrapolatedDFT = dftTime * 64;
    const extrapolatedFFT = fftTime * 10.4;
    console.log(`Estimated DFT Time (N=8192): ${extrapolatedDFT}ms (~${(extrapolatedDFT / 1000).toFixed(1)}s)`);
    console.log(`Estimated FFT Time (N=8192): ${extrapolatedFFT.toFixed(0)}ms`);
    console.log(`Estimated Speedup (N=8192): ${(extrapolatedDFT / extrapolatedFFT).toFixed(1)}x faster`);
}

runBenchmark();
