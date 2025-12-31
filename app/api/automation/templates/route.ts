import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflowService';

// GET /api/automation/templates - List all workflow templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let templates;

    if (category) {
      templates = WorkflowService.getTemplatesByCategory(category);
    } else {
      templates = WorkflowService.getTemplates();
    }

    const categories = WorkflowService.getCategories();

    return NextResponse.json({ templates, categories });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
