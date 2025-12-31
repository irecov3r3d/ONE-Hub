'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { OutputNodeData } from './types';

const OutputNode = memo(({ data, selected }: NodeProps<OutputNodeData>) => {
  const platformColors: Record<string, string> = {
    discord: '#5865f2',
    notion: '#1a1a1a',
    sheets: '#34a853',
    webhook: '#22c55e',
    file: '#64748b',
  };

  const platformIcons: Record<string, string> = {
    discord: '💬',
    notion: '📝',
    sheets: '📊',
    webhook: '🌐',
    file: '💾',
  };

  const color = platformColors[data.platform] || '#64748b';
  const icon = platformIcons[data.platform] || '📤';

  return (
    <div
      className={`
        relative bg-zinc-900 rounded-lg border-2 min-w-[140px]
        transition-all duration-200 shadow-lg
        ${selected ? 'shadow-xl scale-105' : 'border-zinc-700'}
      `}
      style={{ borderColor: selected ? color : undefined }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
      />

      <div
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ backgroundColor: color }}
      >
        <span className="text-lg">{icon}</span>
        <span className="text-white font-semibold text-sm">{data.label}</span>
      </div>

      <div className="px-3 py-2 text-xs text-zinc-400">
        {data.config.target ? (
          <p className="truncate max-w-[120px]">{data.config.target}</p>
        ) : (
          <p className="italic">Click to configure</p>
        )}

        <div className="flex items-center gap-1 mt-2">
          <div
            className={`w-2 h-2 rounded-full ${data.isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}
          />
          <span className="text-[10px]">
            {data.isConfigured ? 'Ready' : 'Needs config'}
          </span>
        </div>
      </div>

      {/* No output handle - this is a terminal node */}
    </div>
  );
});

OutputNode.displayName = 'OutputNode';

export default OutputNode;
