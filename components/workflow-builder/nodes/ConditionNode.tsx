'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ConditionNodeData } from './types';

const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  const color = '#8b5cf6';

  return (
    <div
      className={`
        relative bg-zinc-900 rounded-lg border-2 min-w-[140px]
        transition-all duration-200 shadow-lg
        ${selected ? 'border-violet-500 shadow-xl scale-105' : 'border-zinc-700'}
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
        <span className="text-lg">🔀</span>
        <span className="text-white font-semibold text-sm">{data.label}</span>
      </div>

      <div className="px-3 py-2 text-xs text-zinc-400">
        {data.config.variable ? (
          <div className="space-y-1">
            <p className="font-mono text-[10px]">{data.config.variable}</p>
            <p>{data.conditionType} "{data.config.value}"</p>
          </div>
        ) : (
          <p className="italic">Click to configure</p>
        )}
      </div>

      {/* True branch (top right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-zinc-900"
        style={{ top: '30%' }}
      />

      {/* False branch (bottom right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-zinc-900"
        style={{ top: '70%' }}
      />

      {/* Labels for branches */}
      <div className="absolute right-[-24px] top-[25%] text-[8px] text-green-500 font-bold">
        ✓
      </div>
      <div className="absolute right-[-24px] top-[65%] text-[8px] text-red-500 font-bold">
        ✗
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;
