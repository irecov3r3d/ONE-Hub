import { NextResponse } from 'next/server';
import { resolveSafePath } from '@/lib/organizer/pathUtils';
import { scanDirectory } from '@/lib/organizer/scanUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resolved } = resolveSafePath(body.path ?? '.');

    const result = await scanDirectory(resolved, {
      includeHidden: Boolean(body.includeHidden),
      maxFiles: body.maxFiles ?? 1000,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to scan folder' },
      { status: 400 },
    );
  }
}
