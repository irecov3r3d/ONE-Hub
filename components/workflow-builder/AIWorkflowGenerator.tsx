'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Wand2, AlertCircle, CheckCircle, Key, X } from 'lucide-react';
import { generateWorkflowFromDescription } from '@/lib/services/geminiWorkflowGenerator';
import { Node, Edge } from 'reactflow';
import { WorkflowNodeData } from './nodes/types';

interface AIWorkflowGeneratorProps {
  onWorkflowGenerated: (nodes: Node<WorkflowNodeData>[], edges: Edge[], name: string) => void;
  onClose?: () => void;
}

const EXAMPLE_PROMPTS = [
  "Get song lyrics from ChatGPT, generate music in Suno, post to Discord",
  "Research a topic in Perplexity, summarize with Claude, save to Notion",
  "Generate an image with Midjourney, create a voice description with ElevenLabs",
  "Brainstorm ideas in Gemini, expand them in ChatGPT, create album art with DALL-E",
  "Use NotebookLM to research, then create a podcast script with Claude",
];

export default function AIWorkflowGenerator({ onWorkflowGenerated, onClose }: AIWorkflowGeneratorProps) {
  const [description, setDescription] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  // Save API key to localStorage when it changes
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setShowApiKeyInput(false);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please describe what you want the workflow to do');
      return;
    }

    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      setError('Please enter your Gemini API key first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await generateWorkflowFromDescription(description, apiKey);

      if (!result.success) {
        setError(result.error || 'Failed to generate workflow');
        return;
      }

      if (result.workflow) {
        setSuccess(`Created "${result.workflow.name}" with ${result.workflow.nodes.length} steps!`);
        onWorkflowGenerated(
          result.workflow.nodes,
          result.workflow.edges,
          result.workflow.name
        );

        // Clear after short delay
        setTimeout(() => {
          setDescription('');
          setSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setDescription(example);
    setError(null);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Workflow Generator</h3>
            <p className="text-xs text-zinc-400">Describe your workflow in plain English</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* API Key Section */}
      {showApiKeyInput && (
        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <Key size={16} />
            <span>Gemini API Key Required</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg
                         text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Get your free API key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      )}

      {/* API Key indicator when saved */}
      {!showApiKeyInput && apiKey && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-400 flex items-center gap-1">
            <CheckCircle size={12} />
            API key saved
          </span>
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Change key
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-2">
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError(null);
          }}
          placeholder="Describe your workflow... e.g., 'Get song ideas from ChatGPT, generate music in Suno, post the best one to Discord'"
          rows={3}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                     text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500
                     resize-none transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              handleGenerate();
            }
          }}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Press ⌘+Enter to generate
          </span>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600
                       hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white rounded-lg text-sm font-medium transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Workflow
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 px-3 py-2 rounded-lg">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Example Prompts */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(example)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs
                         rounded-md transition-colors border border-zinc-700 hover:border-zinc-600
                         truncate max-w-[200px]"
              title={example}
            >
              {example.length > 40 ? example.slice(0, 40) + '...' : example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
