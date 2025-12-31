'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DataNodeData } from './types';

const DataNode = memo(({ data, selected }: NodeProps<DataNodeData>) => {
  const transformIcons: Record<string, string> = {
    extract: '📋',
    format: '🔧',
    merge: '🔗',
    split: '✂️',
    filter: '🔍',
  };

  const icon = transformIcons[data.transformType] || '📦';
  const color = '#06b6d4';

  return (
    <div
      className={`
        relative bg-zinc-900 rounded-lg border-2 min-w-[140px]
        transition-all duration-200 shadow-lg
        ${selected ? 'border-cyan-500 shadow-xl scale-105' : 'border-zinc-700'}
      `}
    >
      {/* Multiple input handles for merge node */}
      {data.transformType === 'merge' ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input1"
            className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
            style={{ top: '30%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="input2"
            className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
            style={{ top: '70%' }}
          />
        </>
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
        />
      )}

      <div
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ backgroundColor: color }}
      >
        <span className="text-lg">{icon}</span>
        <span className="text-white font-semibold text-sm">{data.label}</span>
      </div>

      <div className="px-3 py-2 text-xs text-zinc-400">
        {data.config.transform ? (
          <p className="truncate max-w-[120px] font-mono text-[10px]">
            {data.config.transform}
          </p>
        ) : data.config.output ? (
          <p className="truncate">→ {data.config.output}</p>
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

DataNode.displayName = 'DataNode';

export default DataNode;
