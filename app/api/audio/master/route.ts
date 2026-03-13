import { NextRequest, NextResponse } from 'next/server';
import { MasteringService } from '@/vocal-ai-studio/masteringService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl, settings } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Missing audio URL' },
        { status: 400 }
      );
    }

    console.log('🎚️ Mastering audio with settings:', settings);

    // Apply professional mastering
    const masteredUrl = await MasteringService.masterAudio(audioUrl, settings);

    return NextResponse.json({
      masteredUrl,
      settings,
      message: 'Audio mastered successfully',
    });
  } catch (error) {
    console.error('Error mastering audio:', error);
    return NextResponse.json(
      { error: 'Failed to master audio' },
      { status: 500 }
    );
  }
}
