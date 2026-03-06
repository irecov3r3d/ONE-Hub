'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { Song } from '@/types';

interface SongGeneratorProps {
  onSongGenerated: (song: Song) => void;
}

const genres = [
  'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical',
  'R&B', 'Country', 'Metal', 'Indie', 'Folk', 'Latin'
];

const moods = [
  'Happy', 'Sad', 'Energetic', 'Chill', 'Romantic', 'Angry',
  'Peaceful', 'Dark', 'Uplifting', 'Mysterious', 'Nostalgic', 'Epic'
];

export default function SongGenerator({ onSongGenerated }: SongGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [mood, setMood] = useState('Happy');
  const [duration, setDuration] = useState(120);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a song description');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          genre,
          mood,
          duration,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate song');
      }

      const song = await response.json();
      onSongGenerated(song);
      setPrompt('');
    } catch (error) {
      console.error('Error generating song:', error);
      alert('Failed to generate song. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      {/* Prompt Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Song Description
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your song... (e.g., 'An upbeat summer anthem about friendship and adventure')"
          className="w-full h-32 px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          disabled={isGenerating}
        />
      </div>

      {/* Genre Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Genre
        </label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isGenerating}
        >
          {genres.map((g) => (
            <option key={g} value={g} className="bg-gray-900">
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Mood Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Mood
        </label>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={isGenerating}
        >
          {moods.map((m) => (
            <option key={m} value={m} className="bg-gray-900">
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Duration Slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Duration: {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
        </label>
        <input
          type="range"
          min="30"
          max="300"
          step="30"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
          disabled={isGenerating}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0:30</span>
          <span>5:00</span>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating your song...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Song
          </>
        )}
      </button>

      {isGenerating && (
        <div className="mt-4 text-center text-sm text-gray-400">
          This may take a minute... AI is composing your masterpiece
        </div>
      )}
    </div>
  );
}
