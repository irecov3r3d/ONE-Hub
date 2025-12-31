'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AINodeData } from './types';

const AINode = memo(({ data, selected }: NodeProps<AINodeData>) => {
  const platformColors: Record<string, string> = {
    chatgpt: '#10a37f',
    claude: '#cc785c',
    gemini: '#4285f4',
    perplexity: '#20808d',
    notebooklm: '#ea4335',
    suno: '#1a1a1a',
    udio: '#7c3aed',
    midjourney: '#0d1117',
    dalle: '#10a37f',
    elevenlabs: '#1a1a1a',
  };

  const platformIcons: Record<string, string> = {
    chatgpt: '🤖',
    claude: '🧠',
    gemini: '✨',
    perplexity: '🔍',
    notebooklm: '📓',
    suno: '🎵',
    udio: '🎶',
    midjourney: '🎨',
    dalle: '🖼️',
    elevenlabs: '🔊',
  };

  const color = platformColors[data.platform] || '#64748b';
  const icon = platformIcons[data.platform] || '🤖';

  return (
    <div
      className={`
        relative bg-zinc-900 rounded-lg border-2 min-w-[180px]
        transition-all duration-200 shadow-lg
        ${selected ? 'border-white shadow-xl scale-105' : 'border-zinc-700'}
      `}
      style={{ borderColor: selected ? color : undefined }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
      />

      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ backgroundColor: color }}
      >
        <span className="text-lg">{icon}</span>
        <span className="text-white font-semibold text-sm">{data.label}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs text-zinc-400">
        {data.config.prompt ? (
          <p className="truncate max-w-[160px]">"{data.config.prompt}"</p>
        ) : (
          <p className="italic">Click to configure</p>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-1 mt-2">
          <div
            className={`w-2 h-2 rounded-full ${data.isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}
          />
          <span className="text-[10px]">
            {data.isConfigured ? 'Ready' : 'Needs config'}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900"
      />
    </div>
  );
});

AINode.displayName = 'AINode';

export default AINode;
