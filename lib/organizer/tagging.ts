import path from 'path';
import type { OrganizerTagResult } from './types';

const keywordTags: Record<string, string> = {
  invoice: 'invoice',
  receipt: 'receipt',
  bill: 'billing',
  tax: 'tax',
  contract: 'contract',
  resume: 'resume',
  photo: 'photo',
  screenshot: 'screenshot',
  draft: 'draft',
  report: 'report',
  meeting: 'meeting-notes',
  statement: 'statement',
};

const extensionTags: Record<string, string> = {
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'notes',
  md: 'notes',
  jpg: 'photo',
  jpeg: 'photo',
  png: 'image',
  gif: 'image',
  heic: 'photo',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  mov: 'video',
  mp4: 'video',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  csv: 'spreadsheet',
  ppt: 'presentation',
  pptx: 'presentation',
};

export const tagFiles = (paths: string[]): OrganizerTagResult[] => {
  return paths.map(filePath => {
    const fileName = path.basename(filePath).toLowerCase();
    const ext = path.extname(fileName).replace('.', '');
    const tags = new Set<string>();

    Object.entries(keywordTags).forEach(([keyword, tag]) => {
      if (fileName.includes(keyword)) {
        tags.add(tag);
      }
    });

    if (extensionTags[ext]) {
      tags.add(extensionTags[ext]);
    }

    if (tags.size === 0) {
      tags.add('uncategorized');
    }

    return {
      path: filePath,
      tags: Array.from(tags),
      primaryTag: Array.from(tags)[0],
    };
  });
};
