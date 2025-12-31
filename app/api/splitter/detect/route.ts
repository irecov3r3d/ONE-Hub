import { NextRequest, NextResponse } from 'next/server';
import { SplitterService, DEFAULT_SPLITTER_SETTINGS } from '@/lib/services/splitterService';
import type { SplitterSettings } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis, settings } = body as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analysis: any; // EnhancedAudioAnalysis from SplitterService
      settings?: Partial<SplitterSettings>;
    };

    if (!analysis) {
      return NextResponse.json(
        { error: 'Missing analysis data' },
        { status: 400 }
      );
    }

    // Merge with default settings
    const finalSettings: SplitterSettings = {
      ...DEFAULT_SPLITTER_SETTINGS,
      ...settings,
    };

    // Detect split points using advanced analysis
    const splitPoints = await SplitterService.detectSplitPoints(analysis, finalSettings);

    // Create segments from split points
    const segments = await SplitterService.createSegments(splitPoints, analysis, finalSettings);

    return NextResponse.json({
      success: true,
      splitPoints,
      segments,
      settings: finalSettings,
    });
  } catch (error) {
    console.error('Error detecting split points:', error);
    return NextResponse.json(
      { error: 'Failed to detect split points' },
      { status: 500 }
    );
  }
}
