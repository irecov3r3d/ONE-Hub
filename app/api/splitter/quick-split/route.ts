import { NextRequest, NextResponse } from 'next/server';
import { SplitterService, PLATFORM_PRESETS } from '@/lib/services/splitterService';
import type { SocialPlatform } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaUrl, platform } = body as {
      mediaUrl: string;
      platform: SocialPlatform;
    };

    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Missing mediaUrl parameter' },
        { status: 400 }
      );
    }

    // Default to TikTok if platform not specified
    const targetPlatform = platform || 'tiktok';

    // Validate platform
    if (!PLATFORM_PRESETS[targetPlatform]) {
      return NextResponse.json(
        { error: 'Invalid platform specified' },
        { status: 400 }
      );
    }

    // Quick split - auto-detect and split in one step
    const result = await SplitterService.quickSplit(mediaUrl, targetPlatform);

    return NextResponse.json({
      success: true,
      platform: targetPlatform,
      preset: PLATFORM_PRESETS[targetPlatform],
      result,
    });
  } catch (error) {
    console.error('Error performing quick split:', error);
    return NextResponse.json(
      { error: 'Failed to quick split media' },
      { status: 500 }
    );
  }
}

// Get available platforms
export async function GET() {
  return NextResponse.json({
    platforms: Object.values(PLATFORM_PRESETS),
  });
}
