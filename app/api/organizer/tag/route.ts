import { NextResponse } from 'next/server';
import { getOrganizerRoot } from '@/lib/organizer/pathUtils';
import { tagFiles } from '@/lib/organizer/tagging';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const root = getOrganizerRoot();
    const inputFiles: string[] = body.files ?? [];

    const safeFiles = inputFiles.filter(filePath => filePath.startsWith(root));

    const results = tagFiles(safeFiles);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to tag files' }, { status: 400 });
  }
}
