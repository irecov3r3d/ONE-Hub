import { NextRequest, NextResponse } from 'next/server';
import { SplitterService } from '@/lib/services/splitterService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaUrl } = body;

    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Missing mediaUrl parameter' },
        { status: 400 }
      );
    }

    // Analyze the media file
    const analysis = await SplitterService.analyzeMedia(mediaUrl);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing media:', error);
    return NextResponse.json(
      { error: 'Failed to analyze media' },
      { status: 500 }
    );
  }
}
