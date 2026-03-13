'use client';

import { useState } from 'react';
import { Loader2, Music, Mic, Drum, Guitar, Download } from 'lucide-react';
import type { StemFiles } from '@/types';

interface StemSeparatorProps {
  audioUrl: string;
  onStemsGenerated?: (stems: StemFiles) => void;
}

export default function StemSeparator({ audioUrl, onStemsGenerated }: StemSeparatorProps) {
  const [stems, setStems] = useState<StemFiles | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const separateStems = async () => {
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const response = await fetch('/api/audio/stems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to separate stems');
      }

      const data = await response.json();
      setStems(data.stems);
      onStemsGenerated?.(data.stems);
      setProgress(100);
    } catch (error) {
      console.error('Error separating stems:', error);
      alert('Failed to separate stems');
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
  };

  const downloadStem = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const stemInfo = [
    { key: 'vocals' as keyof StemFiles, label: 'Vocals', icon: Mic, color: 'bg-pink-500' },
    { key: 'drums' as keyof StemFiles, label: 'Drums', icon: Drum, color: 'bg-orange-500' },
    { key: 'bass' as keyof StemFiles, label: 'Bass', icon: Guitar, color: 'bg-blue-500' },
    { key: 'other' as keyof StemFiles, label: 'Other', icon: Music, color: 'bg-green-500' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1">Stem Separation</h3>
        <p className="text-sm text-gray-400">
          Isolate vocals, drums, bass, and other instruments
        </p>
      </div>

      {!stems && !isProcessing && (
        <button
          onClick={separateStems}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
        >
          <Music className="w-5 h-5" />
          Separate Stems
        </button>
      )}

      {isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="text-white font-medium">Processing audio...</span>
          </div>

          <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-center text-sm text-gray-400">{progress}% complete</p>
        </div>
      )}

      {stems && (
        <div className="space-y-3">
          {stemInfo.map(({ key, label, icon: Icon, color }) => {
            const stemUrl = stems[key];
            if (!stemUrl) return null;

            return (
              <div
                key={key}
                className="bg-black/20 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${color} bg-opacity-20 rounded`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                  </div>

                  <div>
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-xs text-gray-400">WAV format</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <audio controls className="h-8">
                    <source src={stemUrl} type="audio/wav" />
                  </audio>

                  <button
                    onClick={() => downloadStem(stemUrl, label)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={`Download ${label}`}
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              setStems(null);
              setProgress(0);
            }}
            className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Process Another Track
          </button>
        </div>
      )}
    </div>
  );
}
