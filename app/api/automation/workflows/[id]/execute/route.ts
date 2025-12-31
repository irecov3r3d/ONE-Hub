import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflowService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/automation/workflows/[id]/execute - Execute a workflow
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { customOrder, variables } = body;

    const execution = await WorkflowService.executeWorkflow(
      id,
      customOrder,
      variables
    );

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
