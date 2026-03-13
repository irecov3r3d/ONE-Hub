'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, X, Music2 } from 'lucide-react';
import type { Song } from '@/app/page';

interface GlobalPlayerProps {
  song: Song | null;
  onClose: () => void;
}

export default function GlobalPlayer({ song, onClose }: GlobalPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (song && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
      setIsPlaying(true);
    } else if (!song) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [song]);

  const togglePlay = () => {
    if (!audioRef.current || !song) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleDownload = () => {
    if (!song) return;
    const link = document.createElement('a');
    link.href = song.audioUrl;
    link.download = `${song.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  if (!song) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
        <audio ref={audioRef} src={song.audioUrl} />

        {/* Song Info (Mobile: hidden, Desktop: visible) */}
        <div className="flex items-center gap-3 w-full md:w-1/4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center shrink-0">
            <Music2 className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-white font-medium truncate text-sm md:text-base">{song.title}</h4>
            <p className="text-gray-400 text-xs truncate">{song.genre} • {song.mood}</p>
          </div>
        </div>

        {/* Main Controls & Progress */}
        <div className="flex-1 w-full flex flex-col items-center gap-1">
          <div className="flex items-center gap-6">
            <button
              onClick={togglePlay}
              className="p-3 bg-white text-black hover:scale-105 transition-transform rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="black" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="black" />
              )}
            </button>
          </div>

          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={song.duration}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] text-gray-400 w-10">{formatTime(song.duration)}</span>
          </div>
        </div>

        {/* Volume & Actions */}
        <div className="w-full md:w-1/4 flex items-center justify-end gap-4">
          <div className="hidden md:flex items-center gap-2">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Download song"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
