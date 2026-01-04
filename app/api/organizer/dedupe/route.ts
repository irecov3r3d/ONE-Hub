import { NextResponse } from 'next/server';
import { resolveSafePath } from '@/lib/organizer/pathUtils';
import { scanDirectory } from '@/lib/organizer/scanUtils';
import { hashFile } from '@/lib/organizer/hashUtils';
import type { OrganizerFile } from '@/lib/organizer/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resolved } = resolveSafePath(body.path ?? '.');

    const { files } = await scanDirectory(resolved, {
      includeHidden: Boolean(body.includeHidden),
      maxFiles: body.maxFiles ?? 1500,
    });

    const sizeMap = new Map<number, OrganizerFile[]>();
    files.forEach(file => {
      if (!sizeMap.has(file.size)) {
        sizeMap.set(file.size, []);
      }
      sizeMap.get(file.size)?.push(file);
    });

    const groups: { hash: string; files: OrganizerFile[] }[] = [];

    for (const [size, grouped] of sizeMap.entries()) {
      if (grouped.length < 2 || size === 0) continue;
      const hashMap = new Map<string, OrganizerFile[]>();

      for (const file of grouped) {
        const hash = await hashFile(file.path);
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash)?.push(file);
      }

      for (const [hash, dupes] of hashMap.entries()) {
        if (dupes.length > 1) {
          groups.push({ hash, files: dupes });
        }
      }
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to scan duplicates' }, { status: 400 });
  }
}
