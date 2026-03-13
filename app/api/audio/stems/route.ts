import { NextRequest, NextResponse } from 'next/server';
import { AudioService } from '@/vocal-ai-studio/audioService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Missing audio URL' },
        { status: 400 }
      );
    }

    // Separate stems
    const stems = await AudioService.separateStems(audioUrl);

    return NextResponse.json({
      stems,
      message: 'Stems separated successfully',
    });
  } catch (error) {
    console.error('Error separating stems:', error);
    return NextResponse.json(
      { error: 'Failed to separate stems' },
      { status: 500 }
    );
  }
}
