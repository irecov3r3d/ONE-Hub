'use client';

import { useEffect, useState, useRef } from 'react';
import { AudioWaveform } from 'lucide-react';

interface TransportControlsProps {
  transportState: 'stopped' | 'playing' | 'paused';
  sessionDuration: number;
  onScrub: (value: number) => void;
  getAudioNodes: () => Map<string, { audio: HTMLAudioElement }>;
  initialTime: number;
}

export default function TransportControls({
  transportState,
  sessionDuration,
  onScrub,
  getAudioNodes,
  initialTime,
}: TransportControlsProps) {
  const [displayTime, setDisplayTime] = useState(initialTime);
  const isDragging = useRef(false);

  useEffect(() => {
    if (transportState !== 'playing' || isDragging.current) {
      if (transportState === 'stopped') {
        setDisplayTime(0);
      } else if (transportState === 'paused' || transportState === 'playing') {
        // Sync with initialTime when state changes but not playing
        setDisplayTime(initialTime);
      }
      return;
    }

    let frame = 0;
    const update = () => {
      const nodes = getAudioNodes();
      const firstNode = nodes.values().next().value;
      if (firstNode && !isDragging.current) {
        setDisplayTime(firstNode.audio.currentTime);
      }
      frame = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(frame);
  }, [transportState, getAudioNodes, initialTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setDisplayTime(val);
    onScrub(val);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 text-sm">
      <AudioWaveform className="w-4 h-4 text-purple-300" />
      <span className="text-gray-300">Scrub Wheel</span>
      <input
        type="range"
        min={0}
        max={sessionDuration || 0}
        step={0.01}
        value={displayTime}
        onMouseDown={() => { isDragging.current = true; }}
        onMouseUp={() => { isDragging.current = false; }}
        onTouchStart={() => { isDragging.current = true; }}
        onTouchEnd={() => { isDragging.current = false; }}
        onChange={handleChange}
        disabled={sessionDuration === 0}
        className="w-24 accent-purple-400"
      />
      <span className="text-[10px] text-gray-400 min-w-[40px]">
        {displayTime.toFixed(1)}s
      </span>
    </div>
  );
}
