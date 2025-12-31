import { NextRequest, NextResponse } from 'next/server';
import { WorkflowService } from '@/lib/services/workflowService';

// GET /api/automation/workflows - List all workflows
export async function GET() {
  try {
    const workflows = WorkflowService.getAllWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/automation/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, tabMappings, variables, name, description, tabs } = body;

    let workflow;

    if (templateId) {
      // Create from template
      workflow = WorkflowService.createFromTemplate(
        templateId,
        tabMappings || {},
        variables
      );
    } else {
      // Create custom workflow
      if (!name) {
        return NextResponse.json(
          { error: 'Workflow name is required' },
          { status: 400 }
        );
      }
      workflow = WorkflowService.createCustomWorkflow(
        name,
        description || '',
        tabs || []
      );
    }

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
