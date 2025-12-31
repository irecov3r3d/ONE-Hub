import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflowService';
import { automationEngine } from '@/lib/services/automationEngine';

// GET /api/automation/executions - List execution history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    const history = WorkflowService.getExecutionHistory(workflowId || undefined);
    const activeExecutions = automationEngine.getAllExecutions().filter(
      (e) => e.status === 'running' || e.status === 'paused'
    );

    return NextResponse.json({ history, activeExecutions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/executions - Clear execution history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    WorkflowService.clearExecutionHistory(workflowId || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing executions:', error);
    return NextResponse.json(
      { error: 'Failed to clear executions' },
      { status: 500 }
    );
  }
}
