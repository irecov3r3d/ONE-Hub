'use client';

import { useMemo, useState } from 'react';
import {
  FolderKanban,
  Upload,
  Copy,
  CheckCircle2,
  Bot,
  Trash2,
  FolderCheck,
  RefreshCcw,
  Plus,
  X,
} from 'lucide-react';
import type {
  OrganizerFile,
  OrganizerRule,
  OrganizerTagResult,
  OrganizerMovePlan,
} from '@/lib/organizer/types';
import {
  buildMovePlan,
  createEmptyRule,
  DEFAULT_DESTINATION,
  formatFileSize,
  getRuleSummary,
} from '@/lib/organizer/rules';

interface ScanResponse {
  files: OrganizerFile[];
  truncated: boolean;
  totalScanned: number;
}

interface TagResponse {
  results: OrganizerTagResult[];
}

interface DedupeGroup {
  hash: string;
  files: OrganizerFile[];
}

interface DedupeResponse {
  groups: DedupeGroup[];
}

interface MoveResponse {
  moved: number;
  skipped: number;
  errors: { path: string; message: string }[];
}

const defaultRules: OrganizerRule[] = [
  {
    id: 'rule-invoices',
    name: 'Invoices & receipts',
    matchType: 'nameContains',
    pattern: 'invoice,receipt,bill',
    destinationTemplate: 'Finance/{year}/Invoices',
    enabled: true,
  },
  {
    id: 'rule-images',
    name: 'Photos',
    matchType: 'extension',
    pattern: 'jpg,jpeg,png,heic',
    destinationTemplate: 'Media/Photos/{year}/{month}',
    enabled: true,
  },
];

export default function FileOrganizer() {
  const [rootPath, setRootPath] = useState('');
  const [files, setFiles] = useState<OrganizerFile[]>([]);
  const [scanState, setScanState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [scanError, setScanError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);
  const [rules, setRules] = useState<OrganizerRule[]>(defaultRules);
  const [tagging, setTagging] = useState(false);
  const [tagResults, setTagResults] = useState<Record<string, OrganizerTagResult>>({});
  const [dedupeState, setDedupeState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [dedupeGroups, setDedupeGroups] = useState<DedupeGroup[]>([]);
  const [moveState, setMoveState] = useState<'idle' | 'moving' | 'done'>('idle');
  const [moveResult, setMoveResult] = useState<MoveResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const activeRules = useMemo(() => rules.filter(rule => rule.enabled), [rules]);

  const plan = useMemo<OrganizerMovePlan>(() => {
    return buildMovePlan(files, activeRules, tagResults);
  }, [files, activeRules, tagResults]);

  const copyPlan = async () => {
    if (plan.moves.length === 0) return;
    const text = plan.moves
      .map(move => `${move.from} -> ${move.to}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleScan = async () => {
    setScanState('loading');
    setScanError('');
    setMoveResult(null);
    setDedupeGroups([]);
    setDedupeState('idle');

    try {
      const response = await fetch('/api/organizer/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rootPath }),
      });

      if (!response.ok) {
        throw new Error('Unable to scan folder');
      }

      const data: ScanResponse = await response.json();
      setFiles(data.files);
      setTruncated(data.truncated);
      setTotalScanned(data.totalScanned);
      setScanState('idle');
    } catch (error) {
      console.error(error);
      setScanState('error');
      setScanError('Scan failed. Check the server root path or permissions.');
    }
  };

  const handleTag = async () => {
    if (files.length === 0) return;
    setTagging(true);

    try {
      const response = await fetch('/api/organizer/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files.map(file => file.path) }),
      });

      if (!response.ok) {
        throw new Error('Unable to tag files');
      }

      const data: TagResponse = await response.json();
      const nextResults: Record<string, OrganizerTagResult> = {};
      data.results.forEach(result => {
        nextResults[result.path] = result;
      });
      setTagResults(nextResults);
    } catch (error) {
      console.error(error);
    } finally {
      setTagging(false);
    }
  };

  const handleDedupe = async () => {
    if (!rootPath) return;
    setDedupeState('loading');
    try {
      const response = await fetch('/api/organizer/dedupe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rootPath }),
      });

      if (!response.ok) {
        throw new Error('Unable to scan duplicates');
      }

      const data: DedupeResponse = await response.json();
      setDedupeGroups(data.groups);
      setDedupeState('ready');
    } catch (error) {
      console.error(error);
      setDedupeState('idle');
    }
  };

  const handleApplyDedupe = async (group: DedupeGroup) => {
    if (group.files.length <= 1) return;
    const [keep, ...remove] = group.files;

    await fetch('/api/organizer/dedupe/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keepPath: keep.path,
        removePaths: remove.map(file => file.path),
        trashFolder: `${rootPath}/Duplicates`,
      }),
    });

    setDedupeGroups(prev => prev.filter(item => item.hash !== group.hash));
  };

  const handleMove = async () => {
    if (plan.moves.length === 0) return;
    setMoveState('moving');

    try {
      const response = await fetch('/api/organizer/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: plan.moves }),
      });

      const data: MoveResponse = await response.json();
      setMoveResult(data);
      setMoveState('done');
    } catch (error) {
      console.error(error);
      setMoveState('idle');
    }
  };

  const handleAddRule = () => {
    setRules(prev => [...prev, createEmptyRule()]);
  };

  const handleUpdateRule = (id: string, patch: Partial<OrganizerRule>) => {
    setRules(prev => prev.map(rule => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
  };

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-white/10">
            <FolderKanban className="w-6 h-6 text-purple-300" />
          </div>
          <h2 className="text-2xl font-bold text-white">Drive Organizer</h2>
        </div>
        <p className="text-gray-400">
          Scan a folder on the server, apply smart rules, tag with lightweight AI
          heuristics, and auto-move files into a clean structure.
        </p>
      </div>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">Root folder</label>
            <input
              value={rootPath}
              onChange={event => setRootPath(event.target.value)}
              placeholder="/Users/you/Downloads"
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
            />
            <p className="text-xs text-gray-500 mt-2">
              The backend can only access paths under ORGANIZER_ROOT on the server.
            </p>
          </div>
          <button
            type="button"
            onClick={handleScan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {scanState === 'loading' ? 'Scanning...' : 'Scan folder'}
          </button>
        </div>
        {scanState === 'error' && (
          <p className="text-sm text-red-400">{scanError}</p>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span>{files.length} files loaded</span>
            <span>{totalScanned} scanned</span>
            {truncated && <span className="text-yellow-400">Scan truncated</span>}
          </div>
        )}
      </section>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Rules & destinations</h3>
            <p className="text-xs text-gray-400">
              Rules run top to bottom. First match wins.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20"
          >
            <Plus className="w-4 h-4" />
            Add rule
          </button>
        </div>

        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="grid gap-3 lg:grid-cols-[1.4fr,1fr,1.2fr,auto] items-center">
              <input
                value={rule.name}
                onChange={event => handleUpdateRule(rule.id, { name: event.target.value })}
                className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                placeholder="Rule name"
              />
              <select
                value={rule.matchType}
                onChange={event =>
                  handleUpdateRule(rule.id, { matchType: event.target.value as OrganizerRule['matchType'] })
                }
                className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
              >
                <option value="extension">Extension list</option>
                <option value="nameContains">Name contains</option>
                <option value="regex">Regex</option>
                <option value="tagIncludes">AI tag</option>
              </select>
              <input
                value={rule.pattern}
                onChange={event => handleUpdateRule(rule.id, { pattern: event.target.value })}
                className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                placeholder="jpg,png or invoice"
              />
              <div className="flex items-center gap-2">
                <input
                  value={rule.destinationTemplate}
                  onChange={event =>
                    handleUpdateRule(rule.id, { destinationTemplate: event.target.value })
                  }
                  className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                  placeholder="Finance/{year}/Invoices"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRule(rule.id)}
                  className="p-2 rounded-lg bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500">
          Tokens: <code>{'{year}'}</code>, <code>{'{month}'}</code>, <code>{'{ext}'}</code>, <code>{'{tag}'}</code>, <code>{'{name}'}</code>
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTag}
            disabled={tagging || files.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            {tagging ? 'Tagging...' : 'AI tag files'}
          </button>
          <button
            type="button"
            onClick={handleDedupe}
            disabled={!rootPath}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Find duplicates
          </button>
          <button
            type="button"
            onClick={copyPlan}
            disabled={plan.moves.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Plan copied' : 'Copy plan'}
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={plan.moves.length === 0 || moveState === 'moving'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm hover:bg-purple-600 disabled:opacity-50"
          >
            <FolderCheck className="w-4 h-4" />
            {moveState === 'moving' ? 'Moving...' : 'Apply move plan'}
          </button>
        </div>

        {moveResult && (
          <div className="text-xs text-gray-400">
            {moveResult.moved} moved • {moveResult.skipped} skipped • {moveResult.errors.length} errors
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-black/40 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Move plan preview</h4>
            <div className="max-h-56 overflow-auto text-xs text-gray-400 space-y-1">
              {plan.moves.length === 0 && <p>No moves yet. Scan a folder and add rules.</p>}
              {plan.moves.map(move => (
                <p key={move.from}>
                  {move.from} → <span className="text-purple-300">{move.to}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="bg-black/40 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Rule summary</h4>
            <div className="space-y-2 text-xs text-gray-400">
              {activeRules.map(rule => (
                <div key={rule.id}>
                  <p className="text-white">{rule.name || 'Untitled rule'}</p>
                  <p>{getRuleSummary(rule)}</p>
                </div>
              ))}
              {activeRules.length === 0 && <p>No active rules.</p>}
              <p className="mt-2 text-gray-500">Default destination: {DEFAULT_DESTINATION}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Duplicate cleanup</h3>
        {dedupeState === 'loading' && (
          <p className="text-sm text-gray-400">Scanning for duplicates...</p>
        )}
        {dedupeState === 'ready' && dedupeGroups.length === 0 && (
          <p className="text-sm text-gray-400">No duplicates found.</p>
        )}
        {dedupeGroups.length > 0 && (
          <div className="space-y-4">
            {dedupeGroups.map(group => (
              <div key={group.hash} className="bg-black/40 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{group.files.length} duplicates</p>
                  <button
                    type="button"
                    onClick={() => handleApplyDedupe(group)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Move extras to /Duplicates
                  </button>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-gray-300">
                  {group.files.map(file => (
                    <li key={file.path}>{file.path}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Scanned files</h3>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs text-gray-300">
            <thead className="text-xs uppercase text-gray-500 border-b border-white/10">
              <tr>
                <th className="py-2 pr-4 text-left">File</th>
                <th className="py-2 pr-4 text-left">Size</th>
                <th className="py-2 pr-4 text-left">Tag</th>
                <th className="py-2 text-left">Destination</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => {
                const planItem = plan.moves.find(move => move.from === file.path);
                const tag = tagResults[file.path]?.primaryTag ?? '-';
                return (
                  <tr key={file.path} className="border-b border-white/5 last:border-b-0">
                    <td className="py-2 pr-4 text-white">{file.name}</td>
                    <td className="py-2 pr-4 text-gray-400">{formatFileSize(file.size)}</td>
                    <td className="py-2 pr-4 text-gray-400">{tag}</td>
                    <td className="py-2 text-purple-200">
                      {planItem?.to ?? DEFAULT_DESTINATION}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
