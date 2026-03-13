// Global state management with Zustand
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import type { Song } from '../services/api';

const storage = new MMKV();

interface StoreState {
  // Songs
  songs: Song[];
  currentSong: Song | null;
  isGenerating: boolean;
  generationProgress: number;

  // User
  user: {
    id?: string;
    email?: string;
    subscription?: 'free' | 'premium' | 'pro';
    creditsUsed: number;
    monthlyLimit: number;
  } | null;

  // Settings
  settings: {
    autoMastering: boolean;
    defaultStrategy: string;
    audioQuality: 'low' | 'medium' | 'high';
    notifications: boolean;
    theme: 'dark' | 'light';
  };

  // Actions
  addSong: (song: Song) => void;
  removeSong: (id: string) => void;
  setCurrentSong: (song: Song | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  loadSongs: () => void;
  saveSongs: () => void;
  updateSettings: (settings: Partial<StoreState['settings']>) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  songs: [],
  currentSong: null,
  isGenerating: false,
  generationProgress: 0,
  user: null,
  settings: {
    autoMastering: true,
    defaultStrategy: 'ensemble-top3',
    audioQuality: 'high',
    notifications: true,
    theme: 'dark',
  },

  // Actions
  addSong: (song) => {
    set((state) => ({
      songs: [song, ...state.songs],
    }));
    get().saveSongs();
  },

  removeSong: (id) => {
    set((state) => ({
      songs: state.songs.filter((s) => s.id !== id),
    }));
    get().saveSongs();
  },

  setCurrentSong: (song) => {
    set({ currentSong: song });
  },

  setGenerating: (isGenerating) => {
    set({ isGenerating });
  },

  setGenerationProgress: (progress) => {
    set({ generationProgress: progress });
  },

  loadSongs: () => {
    const songsJson = storage.getString('songs');
    if (songsJson) {
      try {
        const songs = JSON.parse(songsJson);
        set({ songs });
      } catch (error) {
        console.error('Error loading songs:', error);
      }
    }
  },

  saveSongs: () => {
    const { songs } = get();
    storage.set('songs', JSON.stringify(songs));
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings,
      },
    }));
    const { settings } = get();
    storage.set('settings', JSON.stringify(settings));
  },
}));

// Load songs on app start
useStore.getState().loadSongs();
