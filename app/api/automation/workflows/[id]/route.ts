import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflowService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/automation/workflows/[id] - Get a specific workflow
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflow = WorkflowService.getWorkflow(id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// PUT /api/automation/workflows/[id] - Update a workflow
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const workflow = WorkflowService.updateWorkflow(id, updates);
    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/workflows/[id] - Delete a workflow
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = WorkflowService.deleteWorkflow(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
