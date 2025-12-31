import { NextRequest, NextResponse } from 'next/server';
import { TabConfigService } from '@/lib/services/tabConfigService';

// GET /api/automation/tabs - List all configured tabs and presets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePresets = searchParams.get('includePresets') === 'true';

    const tabs = TabConfigService.getAllTabs();
    const response: { tabs: any[]; presets?: any[] } = { tabs };

    if (includePresets) {
      response.presets = TabConfigService.getPresets();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tabs' },
      { status: 500 }
    );
  }
}

// POST /api/automation/tabs - Create a new tab configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { presetId, customizations, config } = body;

    let tab;

    if (presetId) {
      // Create from preset
      tab = TabConfigService.createFromPreset(presetId, customizations);
    } else if (config) {
      // Create custom tab
      tab = TabConfigService.createCustomTab(config);
    } else {
      return NextResponse.json(
        { error: 'Either presetId or config is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ tab }, { status: 201 });
  } catch (error) {
    console.error('Error creating tab:', error);
    return NextResponse.json(
      { error: 'Failed to create tab' },
      { status: 500 }
    );
  }
}
