'use client';

import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { WorkflowNodeData, getCategoryColor } from './nodes/types';

interface PropertiesPanelProps {
  selectedNode: Node<WorkflowNodeData> | null;
  onNodeDataChange: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onDeleteNode: () => void;
}

export default function PropertiesPanel({
  selectedNode,
  onNodeDataChange,
  onDeleteNode,
}: PropertiesPanelProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      setLocalConfig(selectedNode.data.config || {});
    }
  }, [selectedNode?.id]);

  // Update node when config changes
  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);

    if (selectedNode) {
      const isConfigured = Object.values(newConfig).some(
        (v) => v !== undefined && v !== ''
      );
      onNodeDataChange(selectedNode.id, {
        config: newConfig,
        isConfigured,
      });
    }
  };

  // Update label
  const updateLabel = (label: string) => {
    if (selectedNode) {
      onNodeDataChange(selectedNode.id, { label });
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col items-center justify-center text-center p-6">
        <div className="text-4xl mb-4">👆</div>
        <h3 className="text-white font-semibold mb-2">No Node Selected</h3>
        <p className="text-sm text-zinc-400">
          Click on a node in the canvas to configure its properties
        </p>
      </div>
    );
  }

  const categoryColor = getCategoryColor(selectedNode.data.category);

  return (
    <div className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div
        className="p-4 border-b border-zinc-800"
        style={{ borderBottomColor: categoryColor }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Properties</h2>
          <button
            onClick={onDeleteNode}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
            title="Delete node"
          >
            🗑️
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          {selectedNode.data.category.toUpperCase()} • {selectedNode.id}
        </p>
      </div>

      {/* Properties Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Label
          </label>
          <input
            type="text"
            value={selectedNode.data.label}
            onChange={(e) => updateLabel(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-sm text-white focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Category-specific fields */}
        {selectedNode.data.category === 'ai' && (
          <>
            {/* Prompt */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Prompt Template
              </label>
              <textarea
                value={localConfig.prompt || ''}
                onChange={(e) => updateConfig('prompt', e.target.value)}
                placeholder="Enter prompt... Use {{variable}} for dynamic values"
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white focus:outline-none focus:border-zinc-500
                           resize-none font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Tip: Use {'{{'}previousOutput{'}}'}  to reference the output from previous node
              </p>
            </div>

            {/* Extract Selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Extract Selector
              </label>
              <input
                type="text"
                value={localConfig.extractSelector || ''}
                onChange={(e) => updateConfig('extractSelector', e.target.value)}
                placeholder="CSS selector for extraction"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Inject Selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Inject Selector
              </label>
              <input
                type="text"
                value={localConfig.injectSelector || ''}
                onChange={(e) => updateConfig('injectSelector', e.target.value)}
                placeholder="CSS selector for input field"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Wait Type */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Wait For
              </label>
              <select
                value={localConfig.waitCondition?.type || 'timeout'}
                onChange={(e) =>
                  updateConfig('waitCondition', {
                    ...localConfig.waitCondition,
                    type: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="timeout">Timeout (seconds)</option>
                <option value="element">Element appears</option>
                <option value="text">Text appears</option>
              </select>
            </div>

            {/* Wait Value */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                {localConfig.waitCondition?.type === 'timeout'
                  ? 'Seconds'
                  : localConfig.waitCondition?.type === 'element'
                  ? 'Selector'
                  : 'Text to match'}
              </label>
              <input
                type={localConfig.waitCondition?.type === 'timeout' ? 'number' : 'text'}
                value={localConfig.waitCondition?.value || ''}
                onChange={(e) =>
                  updateConfig('waitCondition', {
                    ...localConfig.waitCondition,
                    value:
                      localConfig.waitCondition?.type === 'timeout'
                        ? parseInt(e.target.value) || 0
                        : e.target.value,
                  })
                }
                placeholder={
                  localConfig.waitCondition?.type === 'timeout'
                    ? '30'
                    : localConfig.waitCondition?.type === 'element'
                    ? '.response-complete'
                    : 'Done generating'
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>
          </>
        )}

        {selectedNode.data.category === 'action' && (
          <>
            {/* Selector */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Element Selector
              </label>
              <input
                type="text"
                value={localConfig.selector || ''}
                onChange={(e) => updateConfig('selector', e.target.value)}
                placeholder="CSS selector"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Value (for type action) */}
            {'actionType' in selectedNode.data &&
              selectedNode.data.actionType === 'type' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Text to Type
                  </label>
                  <input
                    type="text"
                    value={localConfig.value || ''}
                    onChange={(e) => updateConfig('value', e.target.value)}
                    placeholder="Text or {{variable}}"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                               text-sm text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              )}

            {/* Duration (for wait action) */}
            {'actionType' in selectedNode.data &&
              selectedNode.data.actionType === 'wait' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Duration (ms)
                  </label>
                  <input
                    type="number"
                    value={localConfig.duration || 1000}
                    onChange={(e) =>
                      updateConfig('duration', parseInt(e.target.value) || 1000)
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                               text-sm text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              )}
          </>
        )}

        {selectedNode.data.category === 'condition' && (
          <>
            {/* Variable */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Variable to Check
              </label>
              <input
                type="text"
                value={localConfig.variable || ''}
                onChange={(e) => updateConfig('variable', e.target.value)}
                placeholder="previousOutput"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Operator */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Condition
              </label>
              <select
                value={localConfig.operator || 'contains'}
                onChange={(e) => updateConfig('operator', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
                <option value="regex">Matches regex</option>
                <option value="length_gt">Length greater than</option>
                <option value="length_lt">Length less than</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Value
              </label>
              <input
                type="text"
                value={localConfig.value || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
                placeholder="Value to compare"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="bg-zinc-800 p-3 rounded-lg text-xs">
              <p className="text-green-400">✓ True → Green handle</p>
              <p className="text-red-400 mt-1">✗ False → Red handle</p>
            </div>
          </>
        )}

        {selectedNode.data.category === 'data' && (
          <>
            {/* Input variable */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Input Variable
              </label>
              <input
                type="text"
                value={localConfig.input || ''}
                onChange={(e) => updateConfig('input', e.target.value)}
                placeholder="previousOutput"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Transform */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Transform Expression
              </label>
              <textarea
                value={localConfig.transform || ''}
                onChange={(e) => updateConfig('transform', e.target.value)}
                placeholder="e.g., value.split('\n')[0]"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500
                           resize-none"
              />
            </div>

            {/* Output variable */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Output Variable Name
              </label>
              <input
                type="text"
                value={localConfig.output || ''}
                onChange={(e) => updateConfig('output', e.target.value)}
                placeholder="transformedData"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>
          </>
        )}

        {selectedNode.data.category === 'output' && (
          <>
            {/* Target */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Target
              </label>
              <input
                type="text"
                value={localConfig.target || ''}
                onChange={(e) => updateConfig('target', e.target.value)}
                placeholder={
                  'platform' in selectedNode.data &&
                  selectedNode.data.platform === 'discord'
                    ? '#channel-name'
                    : 'platform' in selectedNode.data &&
                      selectedNode.data.platform === 'webhook'
                    ? 'https://webhook.url'
                    : 'Target location'
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Template */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Message Template
              </label>
              <textarea
                value={localConfig.template || ''}
                onChange={(e) => updateConfig('template', e.target.value)}
                placeholder="Use {{variable}} for dynamic content"
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                           text-sm text-white focus:outline-none focus:border-zinc-500
                           resize-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Status */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Status</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                selectedNode.data.isConfigured ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            <span className="text-xs text-white">
              {selectedNode.data.isConfigured ? 'Configured' : 'Needs configuration'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
