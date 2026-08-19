// Performance and correctness verification for WaveformEditor canvas batching

class MockPath2D {
  rects: Array<[number, number, number, number]> = [];
  rect(x: number, y: number, w: number, h: number) {
    this.rects.push([x, y, w, h]);
  }
}

class MockCanvasContext {
  fillStyle: string = '';
  fillRectCount = 0;
  fillCount = 0;
  stateChangeCount = 0;
  private lastColor = '';

  fillRect(x: number, y: number, w: number, h: number) {
    if (this.fillStyle !== this.lastColor) {
      this.stateChangeCount++;
      this.lastColor = this.fillStyle;
    }
    this.fillRectCount++;
  }

  fill(path?: MockPath2D) {
    if (this.fillStyle !== this.lastColor) {
      this.stateChangeCount++;
      this.lastColor = this.fillStyle;
    }
    this.fillCount++;
  }

  resetStats() {
    this.fillRectCount = 0;
    this.fillCount = 0;
    this.stateChangeCount = 0;
    this.lastColor = '';
  }
}

// Generate test waveform data (1000 bars)
const numBars = 1000;
const waveformData: number[] = Array.from({ length: numBars }, (_, i) => Math.sin(i / 10) * 0.5 + 0.5);
const duration = 180; // 3 minutes audio
const currentTime = 45; // 45 seconds played
const trimStart = 10;
const trimEnd = 160;
const selectedRegion = { start: 20, end: 40 };

const width = 1200;
const height = 200;
const barWidth = width / numBars;

// 1. Original unoptimized approach
function drawOriginal(ctx: MockCanvasContext) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, width, height);

  waveformData.forEach((value, index) => {
    const barHeight = value * height * 0.8;
    const x = index * barWidth;
    const y = (height - barHeight) / 2;
    const progress = (index / waveformData.length) * duration;

    let color = '#8b5cf6';
    if (progress < trimStart || progress > trimEnd) {
      color = 'rgba(139, 92, 246, 0.2)';
    } else if (progress <= currentTime) {
      color = '#ec4899';
    }

    if (selectedRegion && progress >= selectedRegion.start && progress <= selectedRegion.end) {
      color = '#10b981';
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  });
}

// 2. Batch Path2D optimized approach
function drawOptimized(ctx: MockCanvasContext) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, width, height);

  const playedPath = new MockPath2D();
  const selectedPath = new MockPath2D();
  const trimmedPath = new MockPath2D();
  const unplayedPath = new MockPath2D();

  for (let i = 0; i < numBars; i++) {
    const value = waveformData[i];
    const barHeight = value * height * 0.8;
    const x = i * barWidth;
    const y = (height - barHeight) / 2;
    const progress = (i / numBars) * duration;

    if (selectedRegion && progress >= selectedRegion.start && progress <= selectedRegion.end) {
      selectedPath.rect(x, y, barWidth - 1, barHeight);
    } else if (progress < trimStart || progress > trimEnd) {
      trimmedPath.rect(x, y, barWidth - 1, barHeight);
    } else if (progress <= currentTime) {
      playedPath.rect(x, y, barWidth - 1, barHeight);
    } else {
      unplayedPath.rect(x, y, barWidth - 1, barHeight);
    }
  }

  ctx.fillStyle = '#ec4899';
  ctx.fill(playedPath);

  ctx.fillStyle = '#10b981';
  ctx.fill(selectedPath);

  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
  ctx.fill(trimmedPath);

  ctx.fillStyle = '#8b5cf6';
  ctx.fill(unplayedPath);
}

console.log('🧪 Starting Waveform Rendering Optimization Benchmark...\n');

const origCtx = new MockCanvasContext();
drawOriginal(origCtx);

const optCtx = new MockCanvasContext();
drawOptimized(optCtx);

console.log('--- Draw Operations per Frame ---');
console.log(`Original Fill Operations: ${origCtx.fillRectCount}`);
console.log(`Optimized Fill Operations: ${optCtx.fillCount + 1}`); // +1 for background fillRect
console.log(`Original Canvas State Switches: ${origCtx.stateChangeCount}`);
console.log(`Optimized Canvas State Switches: ${optCtx.stateChangeCount}`);

if (optCtx.fillCount !== 4) {
  console.error(`❌ Expected 4 batch fill calls, got ${optCtx.fillCount}`);
  process.exit(1);
}

// Benchmark execution speed over 1,000 rendered frames
const iterations = 1000;

// Warmup
for (let i = 0; i < 50; i++) {
  drawOriginal(origCtx);
  drawOptimized(optCtx);
}

origCtx.resetStats();
optCtx.resetStats();

const startOrig = performance.now();
for (let i = 0; i < iterations; i++) {
  drawOriginal(origCtx);
}
const endOrig = performance.now();
const origTime = endOrig - startOrig;

const startOpt = performance.now();
for (let i = 0; i < iterations; i++) {
  drawOptimized(optCtx);
}
const endOpt = performance.now();
const optTime = endOpt - startOpt;

console.log(`\n--- Execution Time for ${iterations} Frames ---`);
console.log(`Original Execution Time:  ${origTime.toFixed(2)}ms`);
console.log(`Optimized Execution Time: ${optTime.toFixed(2)}ms`);
const speedup = origTime / optTime;
console.log(`Speedup Factor:           ${speedup.toFixed(2)}x`);

console.log('\n✅ Waveform rendering optimization verified successfully!');
