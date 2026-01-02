'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Music,
  Sparkles,
  Upload,
  FileAudio,
  Type,
  AudioWaveform,
  Scissors,
  Download,
  Image as ImageIcon,
  Library,
} from 'lucide-react';
import SongGenerator from '@/components/SongGenerator';
import SongLibrary from '@/components/SongLibrary';
import FileUpload from '@/components/FileUpload';
import LyricEditor from '@/components/LyricEditor';
import WaveformEditor from '@/components/WaveformEditor';
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

  // Window splitter state
  const [splitMode, setSplitMode] = useState<1 | 2 | 3 | 4>(1);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const [paneTabs, setPaneTabs] = useState<Tab[]>(['generate', 'upload', 'lyrics', 'waveform']);

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
    { id: 'stems' as Tab, label: 'Stems', icon: Scissors },
    { id: 'albumart' as Tab, label: 'Album Art', icon: ImageIcon },
    { id: 'export' as Tab, label: 'Export', icon: Download },
    { id: 'library' as Tab, label: 'Library', icon: Library },
  ];

  // Get the active tab for a specific pane
  const getActiveTabForPane = useCallback((paneIndex: number) => {
    if (splitMode === 1) return activeTab;
    return paneTabs[paneIndex] || 'generate';
  }, [splitMode, activeTab, paneTabs]);

  // Set active tab for a specific pane
  const setActiveTabForPane = useCallback((paneIndex: number, tab: Tab) => {
    if (splitMode === 1) {
      setActiveTab(tab);
    } else {
      setPaneTabs(prev => {
        const newTabs = [...prev];
        newTabs[paneIndex] = tab;
        return newTabs;
      });
    }
  }, [splitMode]);

  // Render content for a specific pane
  const renderPaneContent = useCallback((paneIndex: number) => {
    const tab = getActiveTabForPane(paneIndex);
    const isActive = paneIndex === activePaneIndex;

    return (
      <div className={`h-full overflow-auto border ${isActive ? 'border-purple-500 border-2' : 'border-white/10'} rounded-lg bg-black/20`}>
        <div className="p-4">
          {/* Generate Tab */}
          {tab === 'generate' && (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">Create Your Song</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  Describe your song and let AI bring it to life
                </p>
              </div>
              <SongGenerator onSongGenerated={handleSongGenerated} />
            </div>
          )}

          {/* Upload Tab */}
          {tab === 'upload' && (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Upload Audio Files</h3>
                </div>
                <p className="text-gray-400 text-sm">
                  Upload vocals, instrumentals, samples, or reference tracks
                </p>
              </div>
              <FileUpload onFilesUploaded={handleFilesUploaded} multiple />
            </div>
          )}

          {/* Lyrics Tab */}
          {tab === 'lyrics' && (
            <LyricEditor
              songTheme={currentSong?.prompt || ''}
              genre={currentSong?.genre || 'Pop'}
              mood={currentSong?.mood || 'Happy'}
              onLyricsChange={setLyrics}
            />
          )}

          {/* Waveform Editor Tab */}
          {tab === 'waveform' && (
            <>
              {currentSong || uploadedFiles.length > 0 ? (
                <WaveformEditor
                  audioUrl={currentSong?.audioUrl || uploadedFiles[0]?.url || ''}
                />
              ) : (
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10 text-center">
                  <AudioWaveform className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Audio to Edit</h4>
                  <p className="text-gray-400 text-sm">Generate a song or upload an audio file to start editing</p>
                </div>
              )}
            </>
          )}

          {/* Stems Tab */}
          {tab === 'stems' && (
            <>
              {currentSong || uploadedFiles.length > 0 ? (
                <StemSeparator
                  audioUrl={currentSong?.audioUrl || uploadedFiles[0]?.url || ''}
                />
              ) : (
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10 text-center">
                  <Scissors className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Audio for Stem Separation</h4>
                  <p className="text-gray-400 text-sm">Generate a song or upload an audio file to separate stems</p>
                </div>
              )}
            </>
          )}

          {/* Album Art Tab */}
          {tab === 'albumart' && (
            <>
              {currentSong ? (
                <AlbumArtGenerator
                  songTitle={currentSong.title}
                  genre={currentSong.genre}
                  mood={currentSong.mood}
                />
              ) : (
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Song Selected</h4>
                  <p className="text-gray-400 text-sm">Generate a song first to create album art</p>
                </div>
              )}
            </>
          )}

          {/* Export Tab */}
          {tab === 'export' && (
            <>
              {currentSong || uploadedFiles.length > 0 ? (
                <ExportPanel
                  audioUrl={currentSong?.audioUrl || uploadedFiles[0]?.url || ''}
                  songTitle={currentSong?.title || uploadedFiles[0]?.name || 'song'}
                  lyrics={lyrics}
                />
              ) : (
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10 text-center">
                  <Download className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Audio to Export</h4>
                  <p className="text-gray-400 text-sm">Generate a song or upload an audio file to export</p>
                </div>
              )}
            </>
          )}

          {/* Library Tab */}
          {tab === 'library' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-2">Your Song Library</h3>
                <p className="text-gray-400 text-sm">
                  {songs.length === 0
                    ? 'Your generated songs will appear here'
                    : `${songs.length} song${songs.length !== 1 ? 's' : ''} generated`}
                </p>
              </div>
              <SongLibrary songs={songs} />
            </div>
          )}
        </div>
      </div>
    );
  }, [getActiveTabForPane, activePaneIndex, handleSongGenerated, handleFilesUploaded, currentSong, uploadedFiles, lyrics, songs]);

  // Keyboard handler for window splitting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Split mode shortcuts (Ctrl/Cmd + 1/2/3/4)
      if (isMod && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const mode = parseInt(e.key) as 1 | 2 | 3 | 4;
        setSplitMode(mode);
        setActivePaneIndex(0);
        return;
      }

      // Escape to reset to single pane
      if (e.key === 'Escape' && splitMode !== 1) {
        e.preventDefault();
        setSplitMode(1);
        setActivePaneIndex(0);
        return;
      }

      // Arrow keys to navigate between panes
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && splitMode > 1) {
        e.preventDefault();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setActivePaneIndex(prev => (prev + 1) % splitMode);
        } else {
          setActivePaneIndex(prev => (prev - 1 + splitMode) % splitMode);
        }
        return;
      }

      // [ and ] to switch tabs within active pane
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const currentTab = getActiveTabForPane(activePaneIndex);
        const currentIndex = tabs.findIndex(t => t.id === currentTab);
        const newIndex = e.key === ']'
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTabForPane(activePaneIndex, tabs[newIndex].id);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [splitMode, activePaneIndex, getActiveTabForPane, setActiveTabForPane, tabs]);

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
              const isActive = getActiveTabForPane(activePaneIndex) === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabForPane(activePaneIndex, tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap
                    transition-all
                    ${isActive
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

      {/* Split Layout Container */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Help text - only shown on first load */}
        {splitMode === 1 && (
          <div className="mb-4 text-center text-gray-400 text-sm">
            <p>Keyboard shortcuts: <span className="text-purple-400">Ctrl+2/3/4</span> to split | <span className="text-purple-400">[ ]</span> to switch tabs | <span className="text-purple-400">Arrows</span> to navigate panes</p>
          </div>
        )}

        {/* Single pane (default) */}
        {splitMode === 1 && (
          <div className="max-w-5xl mx-auto">
            {renderPaneContent(0)}
          </div>
        )}

        {/* 2 panes - horizontal split with active pane larger (55/45) */}
        {splitMode === 2 && (
          <div className="flex gap-4 h-[calc(100vh-300px)]">
            <div className={activePaneIndex === 0 ? 'flex-[55]' : 'flex-[45]'}>
              {renderPaneContent(0)}
            </div>
            <div className={activePaneIndex === 1 ? 'flex-[55]' : 'flex-[45]'}>
              {renderPaneContent(1)}
            </div>
          </div>
        )}

        {/* 3 panes - one large, two smaller (50/25/25) */}
        {splitMode === 3 && (
          <div className="flex gap-4 h-[calc(100vh-300px)]">
            {activePaneIndex === 0 ? (
              <>
                <div className="flex-[50]">{renderPaneContent(0)}</div>
                <div className="flex-[25]">{renderPaneContent(1)}</div>
                <div className="flex-[25]">{renderPaneContent(2)}</div>
              </>
            ) : activePaneIndex === 1 ? (
              <>
                <div className="flex-[25]">{renderPaneContent(0)}</div>
                <div className="flex-[50]">{renderPaneContent(1)}</div>
                <div className="flex-[25]">{renderPaneContent(2)}</div>
              </>
            ) : (
              <>
                <div className="flex-[25]">{renderPaneContent(0)}</div>
                <div className="flex-[25]">{renderPaneContent(1)}</div>
                <div className="flex-[50]">{renderPaneContent(2)}</div>
              </>
            )}
          </div>
        )}

        {/* 4 panes - 2x2 grid with active pane slightly larger */}
        {splitMode === 4 && (
          <div className="grid grid-cols-2 gap-4 h-[calc(100vh-300px)]">
            {[0, 1, 2, 3].map(paneIndex => (
              <div
                key={paneIndex}
                className={activePaneIndex === paneIndex ? 'col-span-1 row-span-1' : 'col-span-1 row-span-1'}
                style={activePaneIndex === paneIndex ? { transform: 'scale(1.02)' } : {}}
              >
                {renderPaneContent(paneIndex)}
              </div>
            ))}
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
