'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Music, FileAudio, Mic, Sparkles, File, CheckCircle2, AudioWaveform, Scissors, ArrowRight } from 'lucide-react';
import type { UploadedFile } from '@/types';

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onNavigate?: (tab: any) => void;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  fileType?: 'vocal' | 'instrumental' | 'sample' | 'reference' | 'lyrics';
}

export default function FileUpload({
  onFilesUploaded,
  onNavigate,
  accept = '.mp3,.wav,.ogg,.m4a,.flac,.txt',
  maxSize = 100,
  multiple = true,
  fileType = 'reference',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setUploading(true);

    const validFiles: UploadedFile[] = [];

    for (const file of files) {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB`);
        continue;
      }

      // Validate file type
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!accept.includes(extension)) {
        alert(`File ${file.name} has unsupported format`);
        continue;
      }

      // Upload file
      const uploadedFile = await uploadFile(file, fileType);
      if (uploadedFile) {
        validFiles.push(uploadedFile);
      }
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    onFilesUploaded(validFiles);
    setUploading(false);
    if (validFiles.length > 0) {
      setShowSuccess(true);
    }
  };

  const uploadFile = async (file: File, type: UploadedFile['type']): Promise<UploadedFile | null> => {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // Upload to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Get audio duration for audio files
      let duration: number | undefined;
      if (file.type.startsWith('audio/')) {
        duration = await getAudioDuration(file);
      }

      return {
        id: data.id,
        name: file.name,
        type,
        format: file.name.split('.').pop() || '',
        size: file.size,
        url: data.url,
        duration,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload ${file.name}`);
      return null;
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'vocal':
        return <Mic className="w-5 h-5" />;
      case 'instrumental':
        return <Music className="w-5 h-5" />;
      case 'sample':
        return <FileAudio className="w-5 h-5" />;
      case 'reference':
        return <Sparkles className="w-5 h-5" />;
      case 'lyrics':
        return <File className="w-5 h-5" />;
      default:
        return <FileAudio className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (showSuccess) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Files Uploaded!</h3>
        <p className="text-gray-400 mb-8">
          Your files have been successfully uploaded and are ready for use.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => onNavigate?.('waveform')}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
          >
            <AudioWaveform className="w-8 h-8 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <span className="block text-sm font-medium text-white">Edit in Waveform</span>
          </button>
          <button
            onClick={() => onNavigate?.('stems')}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
          >
            <Scissors className="w-8 h-8 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <span className="block text-sm font-medium text-white">Separate Stems</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowSuccess(false)}
            className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Upload More Files
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-white/20 bg-white/5 hover:border-purple-400 hover:bg-white/10'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`
            p-4 rounded-full transition-colors
            ${isDragging ? 'bg-purple-500' : 'bg-white/10'}
          `}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`} />
          </div>

          <div>
            <p className="text-lg font-semibold text-white mb-1">
              {isDragging ? 'Drop files here' : 'Upload Audio Files'}
            </p>
            <p className="text-sm text-gray-400">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports MP3, WAV, OGG, M4A, FLAC • Max {maxSize}MB
            </p>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
            <div className="text-white">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p>Uploading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Uploaded Files</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-purple-500/20 rounded text-purple-400">
                    {getFileIcon(file.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      {file.duration && <span>{formatDuration(file.duration)}</span>}
                      <span className="capitalize">{file.type}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
