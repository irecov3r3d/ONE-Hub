// API Client - Connects to web backend
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Change this to your deployed backend URL or use localhost for development
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-vercel-app.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for AI generation
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = storage.getString('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface GenerateSongRequest {
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
  strategy?: 'fastest' | 'best-quality' | 'ensemble-top3' | 'ensemble-all' | 'adaptive';
  enableComparison?: boolean;
  enableMastering?: boolean;
}

export interface Song {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
  audioUrl: string;
  createdAt: string;
  metadata?: {
    model: string;
    qualityScore: number;
    mastered: boolean;
    refined: boolean;
    generationTime: number;
    cost: number;
  };
}

export interface ComparisonResult {
  mode: 'comparison';
  title: string;
  generations: Array<{
    id: string;
    modelName: string;
    audioUrl: string;
    metrics: {
      spectralClarity: number;
      dynamicRange: number;
      stereoWidth: number;
      frequencyBalance: number;
      overallScore: number;
    };
    generationTime: number;
  }>;
  bestGeneration: string;
  totalCost: number;
  totalTime: number;
}

// Generate song
export const generateSong = async (params: GenerateSongRequest): Promise<Song | ComparisonResult> => {
  const response = await api.post<Song | ComparisonResult>('/generate', params);
  return response.data;
};

// Upload file
export const uploadFile = async (
  file: Blob,
  type: 'vocal' | 'instrumental' | 'sample' | 'reference' | 'lyrics'
): Promise<{ id: string; url: string }> => {
  const formData = new FormData();
  formData.append('file', file as any);
  formData.append('type', type);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Separate stems
export const separateStems = async (audioUrl: string) => {
  const response = await api.post('/audio/stems', { audioUrl });
  return response.data;
};

// Generate lyrics
export const generateLyrics = async (params: {
  theme: string;
  genre: string;
  mood: string;
  language?: string;
}) => {
  const response = await api.post('/lyrics/generate', params);
  return response.data;
};

// Generate album art
export const generateAlbumArt = async (params: {
  songTitle: string;
  genre: string;
  mood: string;
  settings?: any;
}) => {
  const response = await api.post('/visual/album-art', params);
  return response.data;
};

// Master audio
export const masterAudio = async (audioUrl: string, settings?: any) => {
  const response = await api.post('/audio/master', { audioUrl, settings });
  return response.data;
};

// Export audio
export const exportAudio = async (params: {
  audioUrl: string;
  songTitle: string;
  settings: {
    format: string;
    quality: string;
    sampleRate: number;
  };
}) => {
  const response = await api.post('/export', params);
  return response.data;
};

export default api;
