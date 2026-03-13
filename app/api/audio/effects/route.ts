import { NextRequest, NextResponse } from 'next/server';
import { AudioService } from '@/vocal-ai-studio/audioService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioUrl, effect, parameters } = body;

    if (!audioUrl || !effect) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Map effect names to AudioEffect format
    const effectConfig = {
      id: crypto.randomUUID(),
      type: effect as any,
      parameters: parameters || {},
      enabled: true,
    };

    // Apply effect
    const processedUrl = await AudioService.applyEffects(audioUrl, [effectConfig]);

    return NextResponse.json({
      url: processedUrl,
      effect,
    });
  } catch (error) {
    console.error('Error applying effect:', error);
    return NextResponse.json(
      { error: 'Failed to apply effect' },
      { status: 500 }
    );
  }
}
