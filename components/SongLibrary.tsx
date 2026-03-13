'use client';

import type { Song } from '@/app/page';
import { Music2, Play, Pause, AudioWaveform, Scissors, Image as ImageIcon, Download, Type } from 'lucide-react';

interface SongLibraryProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  activeSongId?: string;
  onAction?: (song: Song, tab: any) => void;
}

export default function SongLibrary({ songs, onPlay, activeSongId, onAction }: SongLibraryProps) {
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

          {/* Controls & Actions */}
          <div className="flex flex-col gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={() => onPlay(song)}
              className={`
                w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-all
                ${activeSongId === song.id
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }
              `}
            >
              {activeSongId === song.id ? (
                <>
                  <Pause className="w-5 h-5" fill="currentColor" />
                  Playing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" fill="currentColor" />
                  Play Song
                </>
              )}
            </button>

            {/* Quick Actions */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => onAction?.(song, 'waveform')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1"
                title="Edit Audio"
              >
                <AudioWaveform className="w-4 h-4" />
                <span className="text-[10px]">Edit</span>
              </button>
              <button
                onClick={() => onAction?.(song, 'lyrics')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1"
                title="Lyrics"
              >
                <Type className="w-4 h-4" />
                <span className="text-[10px]">Lyrics</span>
              </button>
              <button
                onClick={() => onAction?.(song, 'stems')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1"
                title="Separate Stems"
              >
                <Scissors className="w-4 h-4" />
                <span className="text-[10px]">Stems</span>
              </button>
              <button
                onClick={() => onAction?.(song, 'albumart')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1"
                title="Album Art"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-[10px]">Art</span>
              </button>
              <button
                onClick={() => onAction?.(song, 'export')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors flex flex-col items-center gap-1"
                title="Export"
              >
                <Download className="w-4 h-4" />
                <span className="text-[10px]">Export</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
