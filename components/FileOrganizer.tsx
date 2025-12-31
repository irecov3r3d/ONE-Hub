'use client';

import { useMemo, useState, useRef, DragEvent } from 'react';
import {
  FolderKanban,
  Upload,
  Copy,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  Code,
  Table,
  Presentation,
} from 'lucide-react';

interface OrganizedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  category: string;
  suggestedFolder: string;
}

const categoryRules = [
  {
    id: 'Audio',
    icon: Music,
    description: 'Songs, stems, podcasts, and sound assets',
    extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
    folder: 'Audio',
  },
  {
    id: 'Video',
    icon: Video,
    description: 'Clips, screen recordings, and footage',
    extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'],
    folder: 'Video',
  },
  {
    id: 'Images',
    icon: ImageIcon,
    description: 'Artwork, photos, and design exports',
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
    folder: 'Images',
  },
  {
    id: 'Documents',
    icon: FileText,
    description: 'Notes, PDFs, and general docs',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt'],
    folder: 'Documents',
  },
  {
    id: 'Spreadsheets',
    icon: Table,
    description: 'Budgets, data tables, and CSV exports',
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    folder: 'Spreadsheets',
  },
  {
    id: 'Presentations',
    icon: Presentation,
    description: 'Slide decks and pitch materials',
    extensions: ['ppt', 'pptx', 'key'],
    folder: 'Presentations',
  },
  {
    id: 'Archives',
    icon: Archive,
    description: 'Zipped or compressed bundles',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    folder: 'Archives',
  },
  {
    id: 'Code',
    icon: Code,
    description: 'Scripts, configs, and source files',
    extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'rb', 'go', 'rs', 'php', 'html', 'css', 'json', 'yml', 'yaml'],
    folder: 'Code',
  },
];

const fallbackCategory = {
  id: 'Other',
  description: 'Miscellaneous files',
  folder: 'Other',
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getExtension = (fileName: string) => {
  const parts = fileName.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() ?? '';
};

const getCategoryForExtension = (extension: string) => {
  const match = categoryRules.find(rule => rule.extensions.includes(extension));
  if (match) {
    return {
      id: match.id,
      folder: `${match.folder}/${extension ? extension.toUpperCase() : 'Misc'}`,
    };
  }
  return {
    id: fallbackCategory.id,
    folder: `${fallbackCategory.folder}/${extension ? extension.toUpperCase() : 'Misc'}`,
  };
};

export default function FileOrganizer() {
  const [files, setFiles] = useState<OrganizedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    addFiles(Array.from(event.target.files));
  };

  const addFiles = (incoming: File[]) => {
    const organized = incoming.map(file => {
      const extension = getExtension(file.name);
      const category = getCategoryForExtension(extension);
      return {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || 'unknown',
        extension,
        category: category.id,
        suggestedFolder: category.folder,
      };
    });

    setFiles(prev => [...prev, ...organized]);
  };

  const summary = useMemo(() => {
    return categoryRules
      .map(rule => {
        const items = files.filter(file => file.category === rule.id);
        return {
          id: rule.id,
          icon: rule.icon,
          description: rule.description,
          count: items.length,
          totalSize: items.reduce((acc, file) => acc + file.size, 0),
        };
      })
      .concat({
        id: fallbackCategory.id,
        icon: FolderKanban,
        description: fallbackCategory.description,
        count: files.filter(file => file.category === fallbackCategory.id).length,
        totalSize: files
          .filter(file => file.category === fallbackCategory.id)
          .reduce((acc, file) => acc + file.size, 0),
      })
      .filter(entry => entry.count > 0);
  }, [files]);

  const folderPlan = useMemo(() => {
    if (files.length === 0) return '';
    const lines = files.map(file => `${file.name} → ${file.suggestedFolder}`);
    return lines.join('\n');
  }, [files]);

  const handleCopyPlan = async () => {
    if (!folderPlan) return;
    await navigator.clipboard.writeText(folderPlan);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-white/10">
            <FolderKanban className="w-6 h-6 text-purple-300" />
          </div>
          <h2 className="text-2xl font-bold text-white">Drive Organizer</h2>
        </div>
        <p className="text-gray-400">
          Drop files to get an instant folder plan. We categorize by file type and
          suggest a clean structure you can copy into your drive.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-white/20 bg-white/5 hover:border-purple-400 hover:bg-white/10'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-purple-500' : 'bg-white/10'}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-300'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Drop files to organize</h3>
            <p className="text-sm text-gray-400">Or click to pick files from your device</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopyPlan}
          disabled={!folderPlan}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:hover:bg-purple-500 transition-colors"
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Folder plan copied' : 'Copy folder plan'}
        </button>
        <span className="text-xs text-gray-400">
          {files.length === 0 ? 'No files added yet.' : `${files.length} files organized.`}
        </span>
      </div>

      {summary.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summary.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Icon className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.id}</p>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-300">
                  <span>{item.count} file{item.count !== 1 ? 's' : ''}</span>
                  <span>{formatFileSize(item.totalSize)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {files.length > 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Suggested folder map</h3>
            <span className="text-xs text-gray-400">Drag new files anytime to update.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase text-gray-500 border-b border-white/10">
                <tr>
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2">Suggested Folder</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} className="border-b border-white/5 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-white">{file.name}</td>
                    <td className="py-3 pr-4 text-gray-400">{file.extension || file.type}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatFileSize(file.size)}</td>
                    <td className="py-3 pr-4 text-gray-400">{file.category}</td>
                    <td className="py-3 text-purple-200">{file.suggestedFolder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-400">
            Add some files to see the suggested folder structure.
          </p>
        </div>
      )}
    </div>
  );
}
