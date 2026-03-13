import { NextRequest, NextResponse } from 'next/server';
import { AudioService } from '@/vocal-ai-studio/audioService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl, startTime, endTime } = body;

    if (!audioUrl || startTime === undefined || endTime === undefined) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Trim audio
    const trimmedUrl = await AudioService.trimAudio(audioUrl, startTime, endTime);

    return NextResponse.json({
      url: trimmedUrl,
      startTime,
      endTime,
      duration: endTime - startTime,
    });
  } catch (error) {
    console.error('Error trimming audio:', error);
    return NextResponse.json(
      { error: 'Failed to trim audio' },
      { status: 500 }
    );
  }
}
