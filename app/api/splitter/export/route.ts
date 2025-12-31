import { NextRequest, NextResponse } from 'next/server';
import { SplitterService, DEFAULT_SPLITTER_SETTINGS } from '@/lib/services/splitterService';
import type { Segment, SplitterSettings } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaUrl, segments, settings } = body as {
      mediaUrl: string;
      segments: Segment[];
      settings?: Partial<SplitterSettings>;
    };

    if (!mediaUrl || !segments || segments.length === 0) {
      return NextResponse.json(
        { error: 'Missing mediaUrl or segments' },
        { status: 400 }
      );
    }

    // Merge with default settings
    const finalSettings: SplitterSettings = {
      ...DEFAULT_SPLITTER_SETTINGS,
      ...settings,
    };

    // Export the selected segments
    const result = await SplitterService.exportSegments(mediaUrl, segments, finalSettings);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error exporting segments:', error);
    return NextResponse.json(
      { error: 'Failed to export segments' },
      { status: 500 }
    );
  }
}
