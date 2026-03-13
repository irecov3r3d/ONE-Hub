'use client';

import type { Song } from '@/types';
import AudioPlayer from './AudioPlayer';
import { Music2 } from 'lucide-react';

interface SongLibraryProps {
  songs: Song[];
}

export default function SongLibrary({ songs }: SongLibraryProps) {
  if (songs.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
        <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
          <Music2 className="w-12 h-12 text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          No songs yet
        </h3>
        <p className="text-gray-500">
          Create your first song to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {songs.map((song) => (
        <div
          key={song.id}
          className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all"
        >
          {/* Song Info */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">
              {song.title}
            </h3>
            <p className="text-sm text-gray-400 mb-2 line-clamp-2">
              {song.prompt}
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                {song.genre}
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                {song.mood}
              </span>
              <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full">
                {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Audio Player */}
          <AudioPlayer song={song} />
        </div>
      ))}
    </div>
  );
}
