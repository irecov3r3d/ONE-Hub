'use client';

import React, { useState } from 'react';
import {
  AI_NODE_TEMPLATES,
  ACTION_NODE_TEMPLATES,
  CONDITION_NODE_TEMPLATES,
  DATA_NODE_TEMPLATES,
  OUTPUT_NODE_TEMPLATES,
  NodeTemplate,
} from './nodes/types';

interface NodePaletteItemProps {
  template: NodeTemplate;
}

function NodePaletteItem({ template }: NodePaletteItemProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700
                 rounded-lg cursor-grab active:cursor-grabbing transition-colors
                 border border-zinc-700 hover:border-zinc-500"
      style={{ borderLeftColor: template.color, borderLeftWidth: 3 }}
    >
      <span className="text-lg">{template.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{template.label}</p>
        <p className="text-[10px] text-zinc-400 truncate">{template.description}</p>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  icon: string;
  templates: NodeTemplate[];
  defaultOpen?: boolean;
}

function CategorySection({ title, icon, templates, defaultOpen = false }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-xs text-zinc-500">({templates.length})</span>
        </div>
        <span className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {templates.map((template) => (
            <NodePaletteItem key={template.type} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NodePalette() {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter templates by search
  const filterTemplates = (templates: NodeTemplate[]) => {
    if (!searchTerm) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter(
      (t) =>
        t.label.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term)
    );
  };

  const filteredAI = filterTemplates(AI_NODE_TEMPLATES);
  const filteredActions = filterTemplates(ACTION_NODE_TEMPLATES);
  const filteredConditions = filterTemplates(CONDITION_NODE_TEMPLATES);
  const filteredData = filterTemplates(DATA_NODE_TEMPLATES);
  const filteredOutputs = filterTemplates(OUTPUT_NODE_TEMPLATES);

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🧩</span> Nodes
        </h2>
        <p className="text-xs text-zinc-400 mt-1">Drag nodes to the canvas</p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                     text-sm text-white placeholder-zinc-500 focus:outline-none
                     focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {filteredAI.length > 0 && (
          <CategorySection
            title="AI Platforms"
            icon="🤖"
            templates={filteredAI}
            defaultOpen={true}
          />
        )}

        {filteredActions.length > 0 && (
          <CategorySection
            title="Actions"
            icon="⚡"
            templates={filteredActions}
          />
        )}

        {filteredConditions.length > 0 && (
          <CategorySection
            title="Logic"
            icon="🔀"
            templates={filteredConditions}
          />
        )}

        {filteredData.length > 0 && (
          <CategorySection
            title="Data"
            icon="📦"
            templates={filteredData}
          />
        )}

        {filteredOutputs.length > 0 && (
          <CategorySection
            title="Outputs"
            icon="📤"
            templates={filteredOutputs}
          />
        )}

        {searchTerm &&
          filteredAI.length === 0 &&
          filteredActions.length === 0 &&
          filteredConditions.length === 0 &&
          filteredData.length === 0 &&
          filteredOutputs.length === 0 && (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No nodes found for "{searchTerm}"
            </div>
          )}
      </div>

      {/* Help tip */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-800/50">
        <p className="text-[10px] text-zinc-500 text-center">
          💡 Drag a node onto the canvas, then connect nodes by dragging from handles
        </p>
      </div>
    </div>
  );
}
