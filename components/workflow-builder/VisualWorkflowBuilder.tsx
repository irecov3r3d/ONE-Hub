'use client';

import React, { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import WorkflowCanvas from './WorkflowCanvas';
import { WorkflowNodeData } from './nodes/types';
import { convertToWorkflow, validateWorkflow } from '@/lib/services/workflowConverter';
import { Play, Save, FileDown, FileUp, AlertCircle, CheckCircle } from 'lucide-react';

interface SavedWorkflow {
  id: string;
  name: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  savedAt: Date;
}

export default function VisualWorkflowBuilder() {
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [currentNodes, setCurrentNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedJson, setExportedJson] = useState<string>('');

  // Handle save from canvas
  const handleSave = useCallback((nodes: Node[], edges: Edge[]) => {
    setCurrentNodes(nodes as Node<WorkflowNodeData>[]);
    setCurrentEdges(edges);

    // Validate
    const errors = validateWorkflow(nodes as Node<WorkflowNodeData>[], edges);
    setValidationErrors(errors);

    if (errors.length === 0) {
      // Save to local storage
      const saved: SavedWorkflow = {
        id: `workflow-${Date.now()}`,
        name: workflowName,
        nodes: nodes as Node<WorkflowNodeData>[],
        edges,
        savedAt: new Date(),
      };

      setSavedWorkflows((prev) => [...prev, saved]);
      setSuccessMessage('Workflow saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, [workflowName]);

  // Export workflow to JSON
  const handleExport = useCallback(() => {
    const result = convertToWorkflow(currentNodes, currentEdges, workflowName);

    const exportData = {
      name: workflowName,
      workflow: result.workflow,
      tabConfigs: result.tabConfigs,
      visualData: {
        nodes: currentNodes,
        edges: currentEdges,
      },
      exportedAt: new Date().toISOString(),
    };

    setExportedJson(JSON.stringify(exportData, null, 2));
    setShowExportModal(true);
  }, [currentNodes, currentEdges, workflowName]);

  // Import workflow from JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.visualData?.nodes && data.visualData?.edges) {
          setCurrentNodes(data.visualData.nodes);
          setCurrentEdges(data.visualData.edges);
          setWorkflowName(data.name || 'Imported Workflow');
          setSuccessMessage('Workflow imported successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setValidationErrors(['Invalid workflow file format']);
        }
      } catch (error) {
        setValidationErrors(['Failed to parse workflow file']);
      }
    };
    input.click();
  }, []);

  // Run workflow (simulation for now)
  const handleRun = useCallback(() => {
    const errors = validateWorkflow(currentNodes, currentEdges);

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const result = convertToWorkflow(currentNodes, currentEdges, workflowName);

    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      return;
    }

    // TODO: Connect to actual automation engine
    console.log('Running workflow:', result.workflow);
    console.log('Tab configs:', result.tabConfigs);

    setSuccessMessage(`Workflow "${workflowName}" started with ${result.workflow.steps.length} steps`);
    setTimeout(() => setSuccessMessage(null), 5000);
  }, [currentNodes, currentEdges, workflowName]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Top Toolbar */}
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔧</span> Visual Workflow Builder
          </h1>

          {/* Workflow Name Input */}
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-sm text-white focus:outline-none focus:border-zinc-500
                       w-48"
            placeholder="Workflow name..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600
                       text-white rounded-lg text-sm transition-colors"
          >
            <FileUp size={16} />
            Import
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600
                       text-white rounded-lg text-sm transition-colors"
          >
            <FileDown size={16} />
            Export
          </button>

          <div className="w-px h-6 bg-zinc-700" />

          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500
                       text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Play size={16} />
            Run Workflow
          </button>
        </div>
      </div>

      {/* Messages */}
      {(validationErrors.length > 0 || successMessage) && (
        <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          {validationErrors.length > 0 && (
            <div className="flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                {validationErrors.map((error, i) => (
                  <p key={i}>{error}</p>
                ))}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              {successMessage}
            </div>
          )}
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1">
        <WorkflowCanvas
          onSave={handleSave}
          initialNodes={currentNodes}
          initialEdges={currentEdges}
        />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h2 className="text-lg font-bold text-white">Export Workflow</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-zinc-800 p-4 rounded-lg text-xs text-zinc-300 overflow-auto">
                {exportedJson}
              </pre>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-zinc-700">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportedJson);
                  setSuccessMessage('Copied to clipboard!');
                  setTimeout(() => setSuccessMessage(null), 2000);
                }}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([exportedJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
