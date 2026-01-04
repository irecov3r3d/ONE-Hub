'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Tag, Filter, Download, Calendar, Music, BookOpen, Zap, Edit2, Trash2, Save, X } from 'lucide-react';

interface Entry {
  id: number;
  date: string;
  project: string;
  type: 'lyrics' | 'theology' | 'flow-analysis' | 'voice-transcript' | 'demo';
  title: string;
  status: 'draft' | 'revised' | 'final';
  content: string;
  tags: string[];
  notes: string;
}

const STORAGE_KEY = 'mountain-echo-vault-entries';

const initialEntries: Entry[] = [
  {
    id: 1,
    date: '2025-12-20',
    project: 'Lil Lily',
    type: 'lyrics',
    title: 'lillilli2 - Core Transmission',
    status: 'final',
    content: `"Baptize the scarlet sin"
"Shadow succubus"
"Flesh fire scripture"
"Hymns of entropy"
"Quantum kiss"
"Logic/God is/Orbit/Obsidian/Oblivion/Amphibian/Equilibrium"
"Hot lil thot" + "whipped cream"
"Cut throat/weapon/blade"

Flow Science: Ob/Id → Act/Ick → Is/Em rhyme progression
Chopper technique - kundalini activation through syllable speed
Tantric transmission - sexual energy as creative force`,
    tags: ['shadow-work', 'descending-spiral', 'sex-magic', 'chopper-flow', 'lilith-energy'],
    notes: 'Recent work. Created as side project to express what felt "inappropriate for the world." Part of double helix structure - descending spiral counterbalance to Heaven Ain\'t Far.'
  },
  {
    id: 2,
    date: '2025-12-20',
    project: 'Truth Be Told',
    type: 'lyrics',
    title: 'Track 1: Truth Be Told (The Blindfold)',
    status: 'final',
    content: `[Verse 1]
They taught us to look up when the kingdom inside,
Made us pray to the sky just to keep us blind.
Council of Nicaea, they divided the vine,
Turned Yeshua to Jesus, flipped the script in our mind.

They sold God for gold, turned a scroll to a brand,
Changed the truth to a lie, now we work for the man.
But the power's in the people, not the priest or the plan,
Heaven ain't far — it's the breath in your hand.

[Hook]
Truth be told, they been flippin' the word,
Hidin' heaven in the pages so the truth ain't heard.
We gods in disguise, but they twisted our eyes,
Now we breakin' these chains 'cause the spirit won't die.`,
    tags: ['ascending-spiral', 'theological', 'nicaea', 'institutional-critique', 'dirty-south'],
    notes: 'Dirty South Trap Soul - dark cinematic beat, slow 808s, eerie piano. Baton Rouge flow. Challenges Constantine\'s Council of Nicaea and Hebrew/Greek biblical mistranslations.'
  },
  {
    id: 3,
    date: '2025-12-20',
    project: 'Heaven Ain\'t Far',
    type: 'lyrics',
    title: 'Heaven Ain\'t Far - Final Version',
    status: 'final',
    content: `[Verse 1]
I been holdin' on to faith like a hammer and nail,
Tryna build peace while I'm workin' through hell.
Life still swingin', but I learned my skill,
Can't kill a man who already done healed.

[Hook]
Heaven ain't far, but you gotta keep walkin',
Every scar I got just proof I been talkin'.
To the One that listened when the world went dark,
Heaven ain't far, it live in your heart.`,
    tags: ['ascending-spiral', 'personal-testimony', 'healing', 'vulnerability', 'baton-rouge'],
    notes: 'The heart of the album. Vulnerable without being soft, real without being preachy. Baton Rouge authenticity.'
  },
  {
    id: 4,
    date: '2025-12-20',
    project: 'Theological Notes',
    type: 'theology',
    title: 'Double Helix Structure - DNA of Consciousness',
    status: 'final',
    content: `ASCENDING SPIRAL (light path): Heaven Ain't Far, Give It All Away, healing tracks
DESCENDING SPIRAL (shadow path): lillilli2, sex magic, chopper darkness

They never touch, but they're forever intertwined.

Like DNA:
- Two strands run in OPPOSITE directions (5' to 3' / 3' to 5')
- Held together by hydrogen bonds (weak connections, not fusion)
- The SPACE between them is where genetic information lives
- You need BOTH strands for the code to work

The listener stands in the tension between the two spirals.

Biblical Precedent:
- Psalms (worship) vs Lamentations (grief/rage)
- Proverbs (wisdom) vs Ecclesiastes (nihilism)
- Song of Solomon (erotic) vs Ruth (chaste love)

Same Bible. Different energetic frequencies.`,
    tags: ['framework', 'double-helix', 'integration', 'sacred-geometry'],
    notes: 'Core thesis: Light and shadow as separate but intertwined pathways. The space between is where transformation happens.'
  }
];

const MountainEchoVault = () => {
  // Load from localStorage or use initial data
  const [entries, setEntries] = useState<Entry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error loading saved entries:', e);
        }
      }
    }
    return initialEntries;
  });

  // Save to localStorage whenever entries change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newEntry, setNewEntry] = useState({
    project: '',
    type: 'lyrics' as Entry['type'],
    title: '',
    content: '',
    tags: '',
    notes: '',
    status: 'draft' as Entry['status']
  });

  useEffect(() => {
    const shouldWarn = entries.length > 100;
    if (shouldWarn !== showWarning) {
      setShowWarning(shouldWarn);
    }
  }, [entries.length, showWarning]);

  const projects = ['all', ...new Set(entries.map(e => e.project))];
  const types: ('all' | Entry['type'])[] = ['all', 'lyrics', 'theology', 'flow-analysis', 'voice-transcript', 'demo'];
  const statuses: ('all' | Entry['status'])[] = ['all', 'draft', 'revised', 'final'];
  const allTags = [...new Set(entries.flatMap(e => e.tags))];

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProject = selectedProject === 'all' || entry.project === selectedProject;
    const matchesType = selectedType === 'all' || entry.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || entry.status === selectedStatus;
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => entry.tags.includes(tag));

    return matchesSearch && matchesProject && matchesType && matchesStatus && matchesTags;
  });

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNewEntry({...newEntry, content: text});
      setShowPasteMode(false);
      setShowAddEntry(true);
    } catch (err) {
      alert('Could not read clipboard. Please paste manually into the content field.');
    }
  };

  const addEntry = () => {
    if (!newEntry.title || !newEntry.content || !newEntry.project) {
      alert('Please fill in Project, Title, and Content fields');
      return;
    }

    const entry: Entry = {
      id: Math.max(0, ...entries.map(e => e.id)) + 1,
      date: new Date().toISOString().split('T')[0],
      project: newEntry.project,
      type: newEntry.type,
      title: newEntry.title,
      status: newEntry.status,
      content: newEntry.content,
      tags: newEntry.tags.split(',').map(t => t.trim()).filter(t => t),
      notes: newEntry.notes
    };

    setEntries([...entries, entry]);
    setNewEntry({ project: '', type: 'lyrics', title: '', content: '', tags: '', notes: '', status: 'draft' });
    setShowAddEntry(false);
  };

  const startEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setNewEntry({
      project: entry.project,
      type: entry.type,
      title: entry.title,
      content: entry.content,
      tags: entry.tags.join(', '),
      notes: entry.notes,
      status: entry.status
    });
    setShowAddEntry(true);
  };

  const saveEdit = () => {
    if (!newEntry.title || !newEntry.content || !newEntry.project) {
      alert('Please fill in Project, Title, and Content fields');
      return;
    }

    setEntries(entries.map(entry =>
      entry.id === editingId
        ? {
            ...entry,
            project: newEntry.project,
            type: newEntry.type,
            title: newEntry.title,
            status: newEntry.status,
            content: newEntry.content,
            tags: newEntry.tags.split(',').map(t => t.trim()).filter(t => t),
            notes: newEntry.notes
          }
        : entry
    ));

    setNewEntry({ project: '', type: 'lyrics', title: '', content: '', tags: '', notes: '', status: 'draft' });
    setShowAddEntry(false);
    setEditingId(null);
  };

  const deleteEntry = (id: number) => {
    if (confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mountain-echo-vault-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const exportAll = () => {
    // Export as formatted text with all metadata
    const textContent = entries.map(entry => {
      return `
═══════════════════════════════════════════════════════════════
${entry.title}
═══════════════════════════════════════════════════════════════

Project: ${entry.project}
Type: ${entry.type}
Status: ${entry.status}
Date: ${entry.date}
Tags: ${entry.tags.join(', ')}

CONTENT:
───────────────────────────────────────────────────────────────
${entry.content}
───────────────────────────────────────────────────────────────

NOTES:
${entry.notes}

`;
    }).join('\n\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mountain-echo-vault-full-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const exportFiltered = () => {
    const dataStr = JSON.stringify(filteredEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mountain-echo-vault-filtered-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = (jsonData: string) => {
    try {
      const imported = JSON.parse(jsonData);
      if (Array.isArray(imported)) {
        setEntries(imported);
        alert(`Successfully imported ${imported.length} entries!`);
      } else {
        alert('Invalid format - must be an array of entries');
      }
    } catch (err) {
      alert('Error importing data: ' + (err as Error).message);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        importData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getTypeIcon = (type: Entry['type']) => {
    switch(type) {
      case 'lyrics': return <Music className="w-4 h-4" />;
      case 'theology': return <BookOpen className="w-4 h-4" />;
      case 'flow-analysis': return <Zap className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            144,000 Mountain Echo
          </h1>
          <p className="text-gray-400">Master Vault - Living Bible</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 mb-6 space-y-4">
          {/* Search */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search lyrics, tags, concepts..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowPasteMode(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Paste from Clipboard
            </button>
            <button
              onClick={() => {
                setShowAddEntry(!showAddEntry);
                if (editingId) {
                  setEditingId(null);
                  setNewEntry({ project: '', type: 'lyrics', title: '', content: '', tags: '', notes: '', status: 'draft' });
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Entry
            </button>
            <button
              onClick={exportData}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export JSON
            </button>
            <button
              onClick={exportAll}
              className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export TXT
            </button>
            {filteredEntries.length < entries.length && (
              <button
                onClick={exportFiltered}
                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Filter className="w-5 h-5" />
                Export Filtered
              </button>
            )}
            <label className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              Import JSON
            </label>
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <select
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(p => (
                <option key={p} value={p}>{p === 'all' ? 'All Projects' : p}</option>
              ))}
            </select>

            <select
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {types.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>

            <select
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Tag Cloud */}
          <div className="flex gap-2 flex-wrap">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Warning for large datasets */}
        {showWarning && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
            <p className="text-yellow-200">⚠️ Large dataset detected ({entries.length} entries). Consider exporting and archiving older content for better performance.</p>
          </div>
        )}

        {/* Paste Mode Popup */}
        {showPasteMode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md">
              <h3 className="text-xl font-bold mb-4">Paste from Clipboard</h3>
              <p className="text-gray-300 mb-4">
                Copy your lyrics or content, then click the button below to auto-fill the content field.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handlePasteFromClipboard}
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Read Clipboard
                </button>
                <button
                  onClick={() => setShowPasteMode(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Entry Form */}
        {showAddEntry && (
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 mb-6 space-y-4 border border-purple-500/30">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Entry' : 'Add New Entry'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Project (e.g., Lil Lily, Heaven Ain't Far)"
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                value={newEntry.project}
                onChange={(e) => setNewEntry({...newEntry, project: e.target.value})}
              />
              <select
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                value={newEntry.type}
                onChange={(e) => setNewEntry({...newEntry, type: e.target.value as Entry['type']})}
              >
                <option value="lyrics">Lyrics</option>
                <option value="theology">Theology</option>
                <option value="flow-analysis">Flow Analysis</option>
                <option value="voice-transcript">Voice Transcript</option>
                <option value="demo">Demo</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Title"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              value={newEntry.title}
              onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
            />
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              value={newEntry.status}
              onChange={(e) => setNewEntry({...newEntry, status: e.target.value as Entry['status']})}
            >
              <option value="draft">Draft</option>
              <option value="revised">Revised</option>
              <option value="final">Final</option>
            </select>
            <textarea
              placeholder="Content (exact lyrics, notes, analysis - preserved verbatim)"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 h-40 font-mono"
              value={newEntry.content}
              onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
            />
            <input
              type="text"
              placeholder="Tags (comma separated: shadow-work, chopper-flow, etc)"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              value={newEntry.tags}
              onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
            />
            <textarea
              placeholder="Notes (Claude's analysis, context, etc)"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 h-24"
              value={newEntry.notes}
              onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
            />
            <div className="flex gap-4">
              <button
                onClick={editingId ? saveEdit : addEntry}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              <button
                onClick={() => {
                  setShowAddEntry(false);
                  setEditingId(null);
                  setNewEntry({ project: '', type: 'lyrics', title: '', content: '', tags: '', notes: '', status: 'draft' });
                }}
                className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="text-gray-400 mb-4">
          Showing {filteredEntries.length} of {entries.length} entries
          {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
        </div>

        {/* Entries */}
        <div className="space-y-4">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-slate-700 hover:border-purple-500/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(entry.type)}
                    <h3 className="text-xl font-bold">{entry.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {entry.date}
                    </span>
                    <span className="text-purple-400">{entry.project}</span>
                    <span className="text-gray-500">{entry.type}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      entry.status === 'final' ? 'bg-green-900/30 text-green-300' :
                      entry.status === 'revised' ? 'bg-blue-900/30 text-blue-300' :
                      'bg-gray-900/30 text-gray-300'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    title="Edit entry"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 mb-4 font-mono text-sm whitespace-pre-wrap">
                {entry.content}
              </div>

              {entry.notes && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-purple-200 whitespace-pre-wrap">{entry.notes}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {entry.tags.map(tag => (
                  <span
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-2 py-1 bg-slate-700 hover:bg-purple-600 rounded text-xs text-gray-300 cursor-pointer transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No entries found. Try adjusting your search or filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default MountainEchoVault;
