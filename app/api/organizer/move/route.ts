import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { resolveSafePath } from '@/lib/organizer/pathUtils';

interface MoveItem {
  from: string;
  to: string;
}

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
  const errors: { path: string; message: string }[] = [];
  let moved = 0;
  let skipped = 0;

  try {
    const body = await request.json();
    const moves: MoveItem[] = body.moves ?? [];

    for (const move of moves) {
      try {
        const { resolved: fromPath } = resolveSafePath(move.from);
        const { resolved: toPath } = resolveSafePath(move.to);
        const destinationDir = path.dirname(toPath);

        await fs.mkdir(destinationDir, { recursive: true });
        await moveFile(fromPath, toPath);
        moved += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          path: move.from,
          message: error instanceof Error ? error.message : 'Move failed',
        });
      }
    }

    return NextResponse.json({ moved, skipped, errors });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to move files' },
      { status: 400 },
    );
  }
}
