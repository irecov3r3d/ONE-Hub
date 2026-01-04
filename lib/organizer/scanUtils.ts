import fs from 'fs/promises';
import path from 'path';
import type { OrganizerFile } from './types';

interface ScanOptions {
  includeHidden?: boolean;
  maxFiles?: number;
}

const shouldSkip = (name: string, includeHidden: boolean) => {
  if (!includeHidden && name.startsWith('.')) return true;
  if (name === 'node_modules') return true;
  return false;
};

export const scanDirectory = async (
  rootPath: string,
  options: ScanOptions = {},
): Promise<{ files: OrganizerFile[]; truncated: boolean; totalScanned: number }> => {
  const { includeHidden = false, maxFiles = 1000 } = options;
  const files: OrganizerFile[] = [];
  let totalScanned = 0;
  let truncated = false;

  const walk = async (currentPath: string) => {
    if (files.length >= maxFiles) {
      truncated = true;
      return;
    }

    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (shouldSkip(entry.name, includeHidden)) continue;
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        if (files.length >= maxFiles) return;
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const extension = path.extname(entry.name).replace('.', '').toLowerCase();
        files.push({
          path: fullPath,
          name: entry.name,
          extension,
          size: stats.size,
          modifiedAt: stats.mtimeMs,
        });
        totalScanned += 1;
        if (files.length >= maxFiles) {
          truncated = true;
          return;
        }
      }
    }
  };

  await walk(rootPath);
  return { files, truncated, totalScanned };
};
