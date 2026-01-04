import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { resolveSafePath } from '@/lib/organizer/pathUtils';

const moveFile = async (source: string, destination: string) => {
  try {
    await fs.rename(source, destination);
  } catch (error) {
    const moveError = error as NodeJS.ErrnoException;
    if (moveError.code !== 'EXDEV') {
      throw error;
    }
    await fs.copyFile(source, destination);
    await fs.unlink(source);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const keepPath = body.keepPath as string;
    const removePaths: string[] = body.removePaths ?? [];
    const trashFolder = body.trashFolder as string | undefined;

    resolveSafePath(keepPath);

    if (trashFolder) {
      const { resolved: trashPath } = resolveSafePath(trashFolder);
      await fs.mkdir(trashPath, { recursive: true });

      for (const removePath of removePaths) {
        const { resolved } = resolveSafePath(removePath);
        const destination = path.join(trashPath, path.basename(resolved));
        await moveFile(resolved, destination);
      }
    } else {
      for (const removePath of removePaths) {
        const { resolved } = resolveSafePath(removePath);
        await fs.unlink(resolved);
      }
    }

    return NextResponse.json({ removed: removePaths.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to remove duplicates' }, { status: 400 });
  }
}
