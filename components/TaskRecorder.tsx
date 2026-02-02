'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleDot,
  Play,
  Save,
  ScrollText,
  Trash2,
  Upload,
} from 'lucide-react';

const VAULT_KEY = 'taskRecorderVault';

type StepAction = 'click' | 'input' | 'scroll';

type Step = {
  id: string;
  action: StepAction;
  value?: string | number;
  timestamp: number;
};

type VaultEntry = {
  id: string;
  name: string;
  createdAt: string;
  steps: Step[];
};

const WORKSPACE_ITEMS = [
  { id: 'tab-gemini', label: 'Gemini Tab' },
  { id: 'tab-suno', label: 'Suno Tab' },
  { id: 'tab-perplexity', label: 'Perplexity Tab' },
  { id: 'tab-claude', label: 'Claude Tab' },
];

const loadVault = (): VaultEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(VAULT_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as VaultEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveVault = (entries: VaultEntry[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(VAULT_KEY, JSON.stringify(entries));
};

const formatAction = (step: Step) => {
  switch (step.action) {
    case 'click':
      return `Click • ${step.id}`;
    case 'input':
      return `Type • ${step.id} → "${step.value ?? ''}"`;
    case 'scroll':
      return `Scroll • ${step.id} → ${step.value ?? 0}px`;
    default:
      return step.action;
  }
};

export default function TaskRecorder() {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [message, setMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState(WORKSPACE_ITEMS[0].id);
  const [outputLog, setOutputLog] = useState<string[]>([]);

  useEffect(() => {
    setVault(loadVault());
  }, []);

  useEffect(() => {
    if (!isRecording || !workspaceRef.current) {
      return undefined;
    }

    const workspace = workspaceRef.current;

    const recordStep = (step: Step) => {
      if (isReplaying) {
        return;
      }
      setSteps(prev => [...prev, step]);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const id = target?.closest('[data-recorder-id]')?.getAttribute('data-recorder-id');
      if (!id) {
        return;
      }
      recordStep({ id, action: 'click', timestamp: Date.now() });
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      const id = target?.getAttribute('data-recorder-id');
      if (!id) {
        return;
      }
      recordStep({
        id,
        action: 'input',
        value: target.value,
        timestamp: Date.now(),
      });
    };

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const id = target?.getAttribute('data-recorder-id');
      if (!id) {
        return;
      }
      recordStep({
        id,
        action: 'scroll',
        value: target.scrollTop,
        timestamp: Date.now(),
      });
    };

    workspace.addEventListener('click', handleClick, true);
    workspace.addEventListener('input', handleInput, true);
    workspace.addEventListener('scroll', handleScroll, true);

    return () => {
      workspace.removeEventListener('click', handleClick, true);
      workspace.removeEventListener('input', handleInput, true);
      workspace.removeEventListener('scroll', handleScroll, true);
    };
  }, [isRecording, isReplaying]);

  const clearSteps = () => {
    setSteps([]);
  };

  const replaySteps = async () => {
    if (steps.length === 0 || !workspaceRef.current) {
      return;
    }
    setIsReplaying(true);
    for (const step of steps) {
      const target = workspaceRef.current.querySelector(
        `[data-recorder-id="${step.id}"]`
      ) as HTMLElement | null;

      if (target) {
        if (step.action === 'click') {
          target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        if (step.action === 'input') {
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            target.value = String(step.value ?? '');
            target.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        if (step.action === 'scroll') {
          target.scrollTop = Number(step.value ?? 0);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 350));
    }
    setIsReplaying(false);
  };

  const handleSend = () => {
    if (!message.trim()) {
      return;
    }
    const selectedLabel = WORKSPACE_ITEMS.find(item => item.id === selectedTab)?.label;
    setOutputLog(prev => [
      `Sent to ${selectedLabel ?? 'tab'}: ${message}`,
      ...prev,
    ]);
    setMessage('');
  };

  const handleSaveRoutine = () => {
    if (!routineName.trim() || steps.length === 0) {
      return;
    }
    const entry: VaultEntry = {
      id: crypto.randomUUID(),
      name: routineName.trim(),
      createdAt: new Date().toISOString(),
      steps,
    };
    const nextVault = [entry, ...vault];
    setVault(nextVault);
    saveVault(nextVault);
    setRoutineName('');
  };

  const handleLoadRoutine = (entry: VaultEntry) => {
    setSteps(entry.steps);
  };

  const handleDeleteRoutine = (entryId: string) => {
    const nextVault = vault.filter(entry => entry.id !== entryId);
    setVault(nextVault);
    saveVault(nextVault);
  };

  const stepSummary = useMemo(() => {
    if (steps.length === 0) {
      return 'No actions recorded yet.';
    }
    return `${steps.length} action${steps.length === 1 ? '' : 's'} recorded.`;
  }, [steps.length]);

  return (
    <div className="space-y-8">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Local Automation</p>
          <h2 className="text-2xl font-semibold text-white">
            Watch Me → Record → Replay
          </h2>
          <p className="text-gray-300">
            Teach the workflow once inside this workspace. The recorder captures clicks,
            typing, and scroll position without AI intervention.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setIsRecording(prev => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isRecording
                ? 'bg-red-500/80 text-white hover:bg-red-500'
                : 'bg-white/10 text-gray-200 hover:bg-white/20'
            }`}
          >
            <CircleDot className="h-4 w-4" />
            {isRecording ? 'Stop recording' : 'Watch me'}
          </button>
          <button
            onClick={replaySteps}
            disabled={steps.length === 0 || isRecording || isReplaying}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-purple-500/90 text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-white/10"
          >
            <Play className="h-4 w-4" />
            {isReplaying ? 'Replaying…' : 'Go'}
          </button>
          <button
            onClick={clearSteps}
            disabled={steps.length === 0}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-white/10 text-gray-200 hover:bg-white/20 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ScrollText className="h-4 w-4 text-purple-300" />
            {stepSummary}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section
          ref={workspaceRef}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Workspace Sandbox</h3>
              <p className="text-sm text-gray-400">
                Practice the repetitive actions you want to automate.
              </p>
            </div>
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">
              Recording scope
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block text-sm text-gray-300" htmlFor="message">
              Prompt to drop across tabs
            </label>
            <textarea
              id="message"
              data-recorder-id="prompt-input"
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Describe the task for each AI tab…"
              className="min-h-[110px] w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-400 focus:outline-none"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-300" htmlFor="tab-select">
                  Select a target tab
                </label>
                <select
                  id="tab-select"
                  data-recorder-id="tab-select"
                  value={selectedTab}
                  onChange={event => setSelectedTab(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white focus:border-purple-400 focus:outline-none"
                >
                  {WORKSPACE_ITEMS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <button
                  data-recorder-id="send-button"
                  onClick={handleSend}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                >
                  Drop message
                </button>
                <button
                  data-recorder-id="clear-log"
                  onClick={() => setOutputLog([])}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 hover:bg-white/10"
                >
                  Clear outputs
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300" htmlFor="output-log">
                Outputs captured
              </label>
              <div
                id="output-log"
                data-recorder-id="output-log"
                className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-gray-200"
              >
                {outputLog.length === 0 ? (
                  <p className="text-gray-500">Outputs will appear here.</p>
                ) : (
                  <ul className="space-y-2">
                    {outputLog.map((entry, index) => (
                      <li key={`${entry}-${index}`} className="rounded-lg bg-white/5 p-2">
                        {entry}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Vault (Synced Ready)</h3>
            <Upload className="h-4 w-4 text-purple-300" />
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Save your recordings locally. Replace this storage with Chrome Sync or
            cloud storage to sync across devices.
          </p>

          <div className="mt-4 space-y-2">
            <label className="text-sm text-gray-300" htmlFor="routine-name">
              Routine name
            </label>
            <input
              id="routine-name"
              value={routineName}
              onChange={event => setRoutineName(event.target.value)}
              placeholder="e.g. Multi-tab Suno drop"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-purple-400 focus:outline-none"
            />
            <button
              onClick={handleSaveRoutine}
              disabled={!routineName.trim() || steps.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/20 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save to vault
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {vault.length === 0 ? (
              <p className="text-sm text-gray-500">No saved routines yet.</p>
            ) : (
              vault.map(entry => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-white/10 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{entry.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRoutine(entry.id)}
                      className="rounded-full p-1 text-gray-400 hover:text-white"
                      aria-label={`Delete ${entry.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleLoadRoutine(entry)}
                      className="flex-1 rounded-lg bg-purple-500/80 px-3 py-2 text-xs font-medium text-white hover:bg-purple-500"
                    >
                      Load
                    </button>
                    <button
                      onClick={replaySteps}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                    >
                      Replay
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-gray-300">
        <h3 className="text-base font-semibold text-white">How this maps to the extension</h3>
        <ul className="mt-3 space-y-2 text-gray-400">
          <li>
            • The recorder logs clicks, typing, and scrolls inside the scoped
            workspace. This mirrors “Watch me → Go” behavior.
          </li>
          <li>
            • Each routine is stored in the vault and can be retrained if the UI
            changes.
          </li>
          <li>
            • The same structure can be swapped for Chrome Extension APIs to work
            across tabs and sites with DOM selectors.
          </li>
        </ul>
      </section>
    </div>
  );
}
