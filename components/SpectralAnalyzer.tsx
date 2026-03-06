'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface SpectralAnalyzerProps {
  analyserNode: AnalyserNode | null;
}

const spectralBarCount = 20;

export default function SpectralAnalyzer({ analyserNode }: SpectralAnalyzerProps) {
  const [spectralBars, setSpectralBars] = useState<number[]>(
    Array.from({ length: spectralBarCount }, () => 12),
  );

  useEffect(() => {
    if (!analyserNode) return;
    let frame = 0;
    const data = new Uint8Array(analyserNode.frequencyBinCount);

    const updateBars = () => {
      analyserNode.getByteFrequencyData(data);
      const bucketSize = Math.floor(data.length / spectralBarCount);
      const nextBars = Array.from({ length: spectralBarCount }, (_, index) => {
        const start = index * bucketSize;
        const end = start + bucketSize;
        let sum = 0;
        for (let i = start; i < end; i += 1) {
          sum += data[i];
        }
        return Math.max(6, Math.round((sum / bucketSize / 255) * 100));
      });
      setSpectralBars(nextBars);
      frame = requestAnimationFrame(updateBars);
    };

    updateBars();
    return () => cancelAnimationFrame(frame);
  }, [analyserNode]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Spectral Analysis</h3>
        <SlidersHorizontal className="w-5 h-5 text-purple-300" />
      </div>
      <div className="flex items-end gap-2 h-32">
        {spectralBars.map((height, index) => (
          <div
            key={index}
            style={{ height: `${height}%` }}
            className="flex-1 rounded-full bg-gradient-to-t from-purple-600/80 to-pink-400/40"
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Toggle spectral view on demand to keep the main workspace focused.
      </p>
    </div>
  );
}
