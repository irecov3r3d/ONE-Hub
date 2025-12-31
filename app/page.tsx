'use client';

import { useState } from 'react';
import {
  Music,
  Sparkles,
  Upload,
  FileAudio,
  Type,
  AudioWaveform,
  Scissors,
  Clapperboard,
  MicOff,
  Download,
  Image as ImageIcon,
  Library,
} from 'lucide-react';
import SongGenerator from '@/components/SongGenerator';
import SongLibrary from '@/components/SongLibrary';
import FileUpload from '@/components/FileUpload';
import LyricEditor from '@/components/LyricEditor';
import WaveformEditor from '@/components/WaveformEditor';
import VideoAudioSplitter from '@/components/VideoAudioSplitter';
import VocalRemover from '@/components/VocalRemover';
import StemSeparator from '@/components/StemSeparator';
import AlbumArtGenerator from '@/components/AlbumArtGenerator';
import ExportPanel from '@/components/ExportPanel';
import type { UploadedFile } from '@/types';

export interface Song {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
  audioUrl: string;
  createdAt: Date;
}

type Tab =
  | 'generate'
  | 'upload'
  | 'lyrics'
  | 'waveform'
  | 'splitter'
  | 'vocals'
  | 'stems'
  | 'albumart'
  | 'export'
  | 'library';

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [lyrics, setLyrics] = useState('');

  const handleSongGenerated = (song: Song) => {
    setSongs(prev => [song, ...prev]);
    setCurrentSong(song);
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const tabs = [
    { id: 'generate' as Tab, label: 'Generate', icon: Sparkles },
    { id: 'upload' as Tab, label: 'Upload', icon: Upload },
    { id: 'lyrics' as Tab, label: 'Lyrics', icon: Type },
    { id: 'waveform' as Tab, label: 'Editor', icon: AudioWaveform },
    { id: 'splitter' as Tab, label: 'Auto Clip', icon: Clapperboard },
    { id: 'vocals' as Tab, label: 'Vocal Remove', icon: MicOff },
    { id: 'stems' as Tab, label: 'Stems', icon: Scissors },
    { id: 'albumart' as Tab, label: 'Album Art', icon: ImageIcon },
    { id: 'export' as Tab, label: 'Export', icon: Download },
    { id: 'library' as Tab, label: 'Library', icon: Library },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Music className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Song Generator Pro</h1>
              <p className="text-purple-300 text-sm">
                Complete AI music creation platform
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap
                    transition-all
                    ${activeTab === tab.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Create Your Song</h2>
              </div>
              <p className="text-gray-400">
                Describe your song and let AI bring it to life
              </p>
            </div>
            <SongGenerator onSongGenerated={handleSongGenerated} />
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Upload Audio Files</h2>
              </div>
              <p className="text-gray-400">
                Upload vocals, instrumentals, samples, or reference tracks
              </p>
            </div>
            <FileUpload onFilesUploaded={handleFilesUploaded} multiple />
          </div>
        )}

        {/* Lyrics Tab */}
        {activeTab === 'lyrics' && (
          <div className="max-w-3xl mx-auto">
            <LyricEditor
              songTheme={currentSong?.prompt || ''}
              genre={currentSong?.genre || 'Pop'}
              mood={currentSong?.mood || 'Happy'}
              onLyricsChange={setLyrics}
            />
          </div>
        )}

        {/* Waveform Editor Tab */}
        {activeTab === 'waveform' && (
          <div className="max-w-5xl mx-auto">
            {currentSong || uploadedFiles.length > 0 ? (
              <WaveformEditor
                audioUrl={currentSong?.audioUrl || uploadedFiles[0]?.url || ''}
              />
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
                <AudioWaveform className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Audio to Edit
                </h3>
                <p className="text-gray-400 mb-6">
                  Generate a song or upload an audio file to start editing
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    Generate Song
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Upload File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto Clip Splitter Tab */}
        {activeTab === 'splitter' && (
          <div className="max-w-4xl mx-auto">
            <VideoAudioSplitter
              uploadedFileUrl={currentSong?.audioUrl || uploadedFiles[0]?.url}
            />
          </div>
        )}

        {/* Vocal Remover Tab */}
        {activeTab === 'vocals' && (
          <div className="max-w-2xl mx-auto">
            <VocalRemover
              uploadedFileUrl={currentSong?.audioUrl || uploadedFiles[0]?.url}
            />
          </div>
        )}

        {/* Stems Tab */}
        {activeTab === 'stems' && (
          <div className="max-w-2xl mx-auto">
            {currentSong || uploadedFiles.length > 0 ? (
              <StemSeparator
                audioUrl={currentSong?.audioUrl || uploadedFiles[0]?.url || ''}
              />
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
                <Scissors className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Audio for Stem Separation
                </h3>
                <p className="text-gray-400 mb-6">
                  Generate a song or upload an audio file to separate stems
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    Generate Song
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Upload File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Album Art Tab */}
        {activeTab === 'albumart' && (
          <div className="max-w-2xl mx-auto">
            {currentSong ? (
              <AlbumArtGenerator
                songTitle={currentSong.title}
                genre={currentSong.genre}
                mood={currentSong.mood}
              />
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
                <ImageIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Song Selected
                </h3>
                <p className="text-gray-400 mb-6">
                  Generate a song first to create album art
                </p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  Generate Song
                </button>
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="max-w-2xl mx-auto">
            {currentSong || uploadedFiles.length > 0 ? (
              <ExportPanel
                audioUrl={currentSong?.audioUrl || uploadedFiles[0]?.url || ''}
                songTitle={currentSong?.title || uploadedFiles[0]?.name || 'song'}
                lyrics={lyrics}
              />
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
                <Download className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Audio to Export
                </h3>
                <p className="text-gray-400 mb-6">
                  Generate a song or upload an audio file to export
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    Generate Song
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Upload File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Your Song Library</h2>
              <p className="text-gray-400">
                {songs.length === 0
                  ? 'Your generated songs will appear here'
                  : `${songs.length} song${songs.length !== 1 ? 's' : ''} generated`}
              </p>
            </div>
            <SongLibrary songs={songs} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-gray-500 text-sm">
            AI-powered music creation platform • Built with Next.js • Open Source
          </p>
        </div>
      </footer>
    </main>
  );
}
