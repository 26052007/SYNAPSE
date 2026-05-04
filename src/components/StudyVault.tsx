import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen, Brain, Download, FileImage, FileText, FolderOpen, Plus, Send, Sparkles, Users, MessageSquare,
} from 'lucide-react';
import { cn } from '../lib/utils';

type VaultAsset = {
  id: string;
  subject: string;
  title: string;
  type: 'text' | 'image' | 'pdf';
  content?: string;
  dataUrl?: string;
  fileName?: string;
  owner?: string;
  createdAt: string;
};

type GroupRoom = {
  id: string;
  name: string;
  code: string;
  members: { uid: string; name: string; isOwner?: boolean }[];
  messages: { id: string; senderName: string; text: string; sentAt: string }[];
  notes: { id: string; title: string; content: string; authorName: string; createdAt: string }[];
};

type ChatMsg = { id: string; sender: 'user' | 'ai'; text: string };

const PERSONAL_KEY = 'synapse-vault-personal-v2';
const BACKEND_BASE = localStorage.getItem('synapse-backend-url') || 'http://localhost:8080';
const BACKEND_TOKEN_KEY = 'synapse-backend-token';
const AI_MODEL_STORAGE = 'synapse-vault-gemini-model';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

async function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function groupBySubject(items: VaultAsset[]): Record<string, VaultAsset[]> {
  return items.reduce((acc, item) => {
    const key = item.subject || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, VaultAsset[]>);
}

function backendRequest(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem(BACKEND_TOKEN_KEY);
  return fetch(`${BACKEND_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

export default function StudyVault() {
  const [tab, setTab] = useState<'personal' | 'group' | 'ai'>('personal');

  const [personalAssets, setPersonalAssets] = useState<VaultAsset[]>(() => readLocal(PERSONAL_KEY, []));
  const [subjectInput, setSubjectInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [textNote, setTextNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState('');
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [groupStage, setGroupStage] = useState<'entry' | 'create' | 'join' | 'room'>('entry');
  const [groupScreenTab, setGroupScreenTab] = useState<'notes' | 'chat'>('notes');
  const [noteSort, setNoteSort] = useState<'recent' | 'uploader' | 'subject'>('recent');
  const [groupMsg, setGroupMsg] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [groupNoteTitle, setGroupNoteTitle] = useState('');
  const [groupNoteContent, setGroupNoteContent] = useState('');
  const [groupStatus, setGroupStatus] = useState('');

  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([
    { id: 'boot', sender: 'ai', text: 'AI AGENT is online. Ask anything from your study vault.' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiModel, setAiModel] = useState(localStorage.getItem(AI_MODEL_STORAGE) || 'gemini-flash-latest');
  const aiEndRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;
  const personalShelves = useMemo(() => groupBySubject(personalAssets), [personalAssets]);
  const sortedGroupNotes = useMemo(() => {
    const notes = [...(activeRoom?.notes || [])];
    const subjectFromTitle = (title: string) => {
      const m = title.match(/^\[(.+?)\]\s*/);
      return m?.[1] || 'General';
    };
    if (noteSort === 'recent') {
      return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (noteSort === 'uploader') {
      return notes.sort((a, b) => a.authorName.localeCompare(b.authorName));
    }
    return notes.sort((a, b) => subjectFromTitle(a.title).localeCompare(subjectFromTitle(b.title)));
  }, [activeRoom, noteSort]);

  useEffect(() => {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(personalAssets));
  }, [personalAssets]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isTyping]);

  useEffect(() => {
    localStorage.setItem(AI_MODEL_STORAGE, aiModel.trim() || 'gemini-flash-latest');
  }, [aiModel]);

  useEffect(() => {
    refreshRooms();
  }, []);

  async function refreshRooms() {
    try {
      const res = await backendRequest('/api/groups');
      if (!res.ok) return;
      const body = await res.json();
      const nextRooms = Array.isArray(body.groups) ? body.groups : [];
      setRooms(nextRooms);
      if (!activeRoomId && nextRooms[0]?.id) {
        setActiveRoomId(nextRooms[0].id);
        setGroupStage('room');
      }
    } catch {
      setGroupStatus('Backend unavailable. Sign in and ensure backend is running.');
    }
  }

  async function addPersonalTextNote() {
    if (!subjectInput.trim() || !titleInput.trim() || !textNote.trim()) return;
    setPersonalAssets((prev) => [
      {
        id: `pv-${Date.now()}`,
        subject: subjectInput.trim(),
        title: titleInput.trim(),
        type: 'text',
        content: textNote.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTitleInput('');
    setTextNote('');
  }

  async function addPersonalFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !subjectInput.trim()) return;
    setUploading(true);
    try {
      const dataUrl = await toDataUrl(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setPersonalAssets((prev) => [
        {
          id: `pf-${Date.now()}`,
          subject: subjectInput.trim(),
          title: titleInput.trim() || file.name,
          type: isPdf ? 'pdf' : 'image',
          dataUrl,
          fileName: file.name,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitleInput('');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function createGroup() {
    if (!createName.trim()) return;
    setGroupStatus('Creating group...');
    try {
      const res = await backendRequest('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: createName.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Failed to create group');
      setCreateName('');
      setGroupStatus(`Group created: ${body.group?.code || ''}`);
      await refreshRooms();
      if (body.group?.id) {
        setActiveRoomId(body.group.id);
        setGroupStage('room');
      }
    } catch (error: any) {
      setGroupStatus(error?.message || 'Failed to create group');
    }
  }

  async function joinGroup() {
    if (!joinCode.trim()) return;
    setGroupStatus('Joining group...');
    try {
      const res = await backendRequest('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Failed to join group');
      setJoinCode('');
      setGroupStatus('Joined group successfully');
      await refreshRooms();
      if (body.group?.id) {
        setActiveRoomId(body.group.id);
        setGroupStage('room');
      }
    } catch (error: any) {
      setGroupStatus(error?.message || 'Failed to join group');
    }
  }

  async function sendGroupMessage() {
    if (!activeRoom || !groupMsg.trim()) return;
    const text = groupMsg.trim();
    setGroupMsg('');
    const res = await backendRequest(`/api/groups/${activeRoom.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (res.ok) refreshRooms();
  }

  async function addGroupNote() {
    if (!activeRoom || !groupNoteTitle.trim()) return;
    const payload = {
      title: `[${groupSubject.trim() || 'General'}] ${groupNoteTitle.trim()}`,
      content: groupNoteContent.trim(),
    };
    const res = await backendRequest(`/api/groups/${activeRoom.id}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setGroupSubject('');
      setGroupNoteTitle('');
      setGroupNoteContent('');
      refreshRooms();
    }
  }

  async function askAi() {
    if (!aiInput.trim()) return;
    const question = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: question }]);
    setIsTyping(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, model: aiModel.trim() || 'gemini-flash-latest' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'AI request failed');
      setAiMessages((prev) => [...prev, { id: `a-${Date.now()}`, sender: 'ai', text: body.answer || 'No answer.' }]);
    } catch (error: any) {
      setAiMessages((prev) => [...prev, { id: `e-${Date.now()}`, sender: 'ai', text: error?.message || 'AI unavailable' }]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Vault</h1>
          <p className="text-sm text-gray-400">Personal shelf, collaborative vault, and live AI agent.</p>
        </div>
        <div className="glass p-1 rounded-xl flex items-center gap-1">
          {[
            ['personal', 'Personal', <BookOpen className="w-4 h-4" />],
            ['group', 'Group', <Users className="w-4 h-4" />],
            ['ai', 'AI AGENT', <Brain className="w-4 h-4" />],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all',
                tab === id ? 'bg-primary text-background' : 'text-gray-400 hover:text-white',
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'personal' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="glass border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} placeholder="Subject (e.g. DSA)" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Title" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
            <button onClick={addPersonalTextNote} className="bg-primary text-background rounded-xl px-4 py-2.5 text-sm font-bold">Add Written Note</button>
            <label className={cn('rounded-xl px-4 py-2.5 text-sm font-bold text-center cursor-pointer', uploading ? 'bg-gray-600' : 'bg-white text-black')}>
              {uploading ? 'Uploading...' : 'Upload PDF/Image'}
              <input type="file" className="hidden" accept="application/pdf,image/*" onChange={addPersonalFile} disabled={uploading} />
            </label>
            <textarea value={textNote} onChange={(e) => setTextNote(e.target.value)} placeholder="Write quick note..." className="md:col-span-4 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm min-h-20 outline-none focus:border-primary/50" />
          </div>

          <div className="space-y-5">
            {Object.keys(personalShelves).length === 0 ? (
              <div className="glass border border-white/10 rounded-2xl p-12 text-center text-gray-500">No notes yet. Add your first shelf item.</div>
            ) : (Object.entries(personalShelves) as [string, VaultAsset[]][]).map(([subject, items]) => (
              <div key={subject} className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{subject}</h3>
                <div className="glass border border-white/10 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map((item) => (
                      <div key={item.id} className="bg-black/25 border border-white/10 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                          {item.type === 'text' ? <FileText className="w-3 h-3" /> : item.type === 'pdf' ? <FolderOpen className="w-3 h-3" /> : <FileImage className="w-3 h-3" />}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <p className="font-bold text-sm mb-2">{item.title}</p>
                        {item.type === 'text' && <p className="text-xs text-gray-300 line-clamp-4">{item.content}</p>}
                        {(item.type === 'pdf' || item.type === 'image') && item.dataUrl && (
                          <a href={item.dataUrl} download={item.fileName || item.title} className="inline-flex items-center gap-1 text-xs text-primary font-bold">
                            <Download className="w-3 h-3" /> Open
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="h-2 bg-gradient-to-r from-amber-700/70 via-amber-500/60 to-amber-700/70 rounded-lg mt-3" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === 'group' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {groupStage === 'entry' && (
            <div className="glass border border-white/10 rounded-2xl p-10 max-w-2xl mx-auto text-center space-y-6">
              <h3 className="text-2xl font-bold">Choose Group Action</h3>
              <p className="text-sm text-gray-400">Start by selecting one option.</p>
              <div className="flex flex-col md:flex-row gap-3">
                <button onClick={() => setGroupStage('create')} className="flex-1 bg-primary text-background rounded-xl py-3 font-bold">Create a Group</button>
                <button onClick={() => setGroupStage('join')} className="flex-1 bg-white/10 border border-white/15 rounded-xl py-3 font-bold">Join by Code</button>
              </div>
              {rooms.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">Existing groups</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {rooms.map((r) => (
                      <button key={r.id} onClick={() => { setActiveRoomId(r.id); setGroupStage('room'); }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10">
                        {r.name} ({r.code})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {groupStage === 'create' && (
            <div className="glass border border-white/10 rounded-2xl p-6 max-w-xl mx-auto space-y-3">
              <h4 className="font-bold">Create Group</h4>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Group name" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
              <div className="flex gap-2">
                <button onClick={() => setGroupStage('entry')} className="px-4 py-2.5 rounded-xl bg-white/10 text-sm font-bold">Back</button>
                <button onClick={createGroup} className="px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-bold">Create & Continue</button>
              </div>
              <p className="text-xs text-gray-500">{groupStatus}</p>
            </div>
          )}

          {groupStage === 'join' && (
            <div className="glass border border-white/10 rounded-2xl p-6 max-w-xl mx-auto space-y-3">
              <h4 className="font-bold">Join Group by Code</h4>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter code" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
              <div className="flex gap-2">
                <button onClick={() => setGroupStage('entry')} className="px-4 py-2.5 rounded-xl bg-white/10 text-sm font-bold">Back</button>
                <button onClick={joinGroup} className="px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-bold">Join & Continue</button>
              </div>
              <p className="text-xs text-gray-500">{groupStatus}</p>
            </div>
          )}

          {groupStage === 'room' && (
            <>
              <div className="glass border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setGroupStage('entry')} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold">Change Group</button>
                  {rooms.map((r) => (
                    <button key={r.id} onClick={() => setActiveRoomId(r.id)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold', activeRoomId === r.id ? 'bg-primary text-background' : 'bg-white/5 text-gray-300')}>
                      {r.name} ({r.code})
                    </button>
                  ))}
                </div>
                <div className="glass p-1 rounded-xl flex">
                  <button onClick={() => setGroupScreenTab('notes')} className={cn('px-3 py-1.5 text-xs font-bold rounded-lg', groupScreenTab === 'notes' ? 'bg-primary text-background' : 'text-gray-400')}>Notes</button>
                  <button onClick={() => setGroupScreenTab('chat')} className={cn('px-3 py-1.5 text-xs font-bold rounded-lg', groupScreenTab === 'chat' ? 'bg-primary text-background' : 'text-gray-400')}>Chat</button>
                </div>
              </div>

              {!activeRoom ? (
                <div className="glass border border-white/10 rounded-2xl p-12 text-center text-gray-500">No active group selected.</div>
              ) : groupScreenTab === 'chat' ? (
                <div className="glass border border-white/10 rounded-2xl flex flex-col min-h-[460px]">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Group Chat</h3>
                    <span className="text-xs text-gray-500">{activeRoom.members?.length || 0} members</span>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {(activeRoom.messages || []).map((m) => (
                      <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-primary font-bold">{m.senderName}</p>
                        <p className="text-sm mt-1">{m.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-white/10 flex gap-2">
                    <input value={groupMsg} onChange={(e) => setGroupMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendGroupMessage()} placeholder="Send message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
                    <button onClick={sendGroupMessage} className="bg-primary text-background rounded-xl px-4"><Send className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="glass border border-white/10 rounded-2xl p-4 space-y-3 min-h-[460px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Group Notes</h3>
                    <select value={noteSort} onChange={(e) => setNoteSort(e.target.value as any)} className="bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs outline-none">
                      <option value="recent">Sort: Recently Added</option>
                      <option value="uploader">Sort: Uploader</option>
                      <option value="subject">Sort: Subject</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input value={groupSubject} onChange={(e) => setGroupSubject(e.target.value)} placeholder="Heading / Subject" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
                    <input value={groupNoteTitle} onChange={(e) => setGroupNoteTitle(e.target.value)} placeholder="Note title" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
                    <button onClick={addGroupNote} className="bg-primary text-background rounded-xl py-2.5 text-sm font-bold">Add Note</button>
                    <textarea value={groupNoteContent} onChange={(e) => setGroupNoteContent(e.target.value)} placeholder="Note content" className="md:col-span-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm min-h-24 outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-3 max-h-[280px] overflow-y-auto">
                    {sortedGroupNotes.map((note) => (
                      <div key={note.id} className="bg-black/25 border border-white/10 rounded-xl p-3 text-sm">
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <p className="font-bold">{note.title}</p>
                          <span className="text-[10px] text-gray-500">{note.authorName} • {new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {tab === 'ai' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass border border-white/10 rounded-2xl overflow-hidden min-h-[560px] flex flex-col">
          <div className="relative p-5 border-b border-white/10 overflow-hidden">
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  'linear-gradient(120deg, rgba(0,242,255,0.15) 0%, rgba(112,0,255,0.12) 35%, rgba(0,0,0,0) 70%)',
                  'linear-gradient(220deg, rgba(112,0,255,0.18) 0%, rgba(0,242,255,0.10) 40%, rgba(0,0,0,0) 70%)',
                  'linear-gradient(300deg, rgba(0,242,255,0.16) 0%, rgba(112,0,255,0.12) 45%, rgba(0,0,0,0) 70%)',
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 opacity-60">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-0.5 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  style={{ top: `${8 + i * 7}%`, left: '-20%', width: '140%' }}
                  animate={{ x: ['-15%', '15%', '-15%'] }}
                  transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }}
                />
              ))}
            </div>
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.8, repeat: Infinity }} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary shadow-[0_0_40px_rgba(0,242,255,0.6)]" />
                <div>
                  <h3 className="font-bold text-lg">AI AGENT — Live Stream Surface</h3>
                  <p className="text-xs text-gray-300">Flowing neural lane animation with backend Gemini responses.</p>
                </div>
              </div>
              <input value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="w-56 bg-black/30 border border-white/20 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/60" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {aiMessages.map((m) => (
              <div key={m.id} className={cn('flex', m.sender === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm', m.sender === 'user' ? 'bg-primary text-background' : 'bg-white/10 border border-white/10')}>
                  {m.sender === 'ai' && <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI AGENT</p>}
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && <p className="text-xs text-gray-500">AI is thinking...</p>}
            <div ref={aiEndRef} />
          </div>
          <div className="p-4 border-t border-white/10 flex gap-2">
            <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAi()} placeholder="Ask anything..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50" />
            <button onClick={askAi} className="bg-primary text-background px-5 rounded-xl font-bold"><Send className="w-4 h-4" /></button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
