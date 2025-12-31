'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ActionNodeData } from './types';

const ActionNode = memo(({ data, selected }: NodeProps<ActionNodeData>) => {
  const actionIcons: Record<string, string> = {
    click: '👆',
    type: '⌨️',
    scroll: '📜',
    wait: '⏳',
    screenshot: '📸',
    extract: '📋',
  };

  const icon = actionIcons[data.actionType] || '⚙️';
  const color = '#f59e0b';

  return (
    <div
      className={`
        relative bg-zinc-900 rounded-lg border-2 min-w-[140px]
        transition-all duration-200 shadow-lg
        ${selected ? 'border-amber-500 shadow-xl scale-105' : 'border-zinc-700'}
      `}
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
        {data.config.selector ? (
          <p className="truncate max-w-[120px] font-mono text-[10px]">
            {data.config.selector}
          </p>
        ) : data.config.duration ? (
          <p>{data.config.duration}ms</p>
        ) : (
          <p className="italic">Click to configure</p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';

export default ActionNode;
