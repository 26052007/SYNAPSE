import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, MessageSquare, FileText, 
  Plus, Sparkles, TrendingUp,
  Trophy, Flame, Calendar, 
  Copy, LogOut, FolderPlus, FilePlus, Trash2,
  RefreshCw, Brain, Send, Check, AlertCircle, Code2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────
type Group = {
  id: string;
  name: string;
  code: string;
  ownerName: string;
  createdAt: string;
  members: GroupMember[];
  notes: GroupNote[];
  messages: ChatMessage[];
};

type GroupMember = {
  id: string;
  name: string;
  joinedAt: string;
  isOwner?: boolean;
};

type GroupNote = {
  id: string;
  name: string;
  content: string;
  authorName: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  senderName: string;
  text: string;
  sentAt: string;
};

// ─── Storage ─────────────────────────────────────────────────────
const STORAGE_KEY = 'synapse-groups';
const USER_KEY = 'synapse-group-user';

function loadGroups(): Record<string, Group> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveGroups(groups: Record<string, Group>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function getUserName(): string {
  return localStorage.getItem(USER_KEY) || '';
}

function setUserNameStorage(name: string) {
  localStorage.setItem(USER_KEY, name);
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Main Component ──────────────────────────────────────────────
export default function GroupWorkspace() {
  const [allGroups, setAllGroups] = useState<Record<string, Group>>(loadGroups);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [userName, setUserName] = useState(getUserName());
  
  // UI State
  const [mode, setMode] = useState<'lobby' | 'create' | 'join'>('lobby');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nameInput, setNameInput] = useState(userName);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [msgInput, setMsgInput] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [error, setError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist
  useEffect(() => { saveGroups(allGroups); }, [allGroups]);

  const currentGroup = currentGroupId ? allGroups[currentGroupId] : null;

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentGroup?.messages.length]);

  // ─── Create Group ────────────────────────────────────────────
  const handleCreate = () => {
    if (!nameInput.trim() || !groupName.trim()) {
      setError('Please fill in both your name and the group name');
      return;
    }
    setError('');
    const name = nameInput.trim();
    setUserNameStorage(name);
    setUserName(name);

    const code = generateCode();
    const groupId = Date.now().toString();
    const newGroup: Group = {
      id: groupId,
      name: groupName.trim(),
      code,
      ownerName: name,
      createdAt: new Date().toISOString(),
      members: [{
        id: '1',
        name,
        joinedAt: new Date().toISOString(),
        isOwner: true,
      }],
      notes: [],
      messages: [{
        id: 'm0',
        senderName: 'System',
        text: `Group "${groupName.trim()}" created! Share code ${code} with friends to join.`,
        sentAt: new Date().toISOString(),
      }],
    };

    setAllGroups(prev => ({ ...prev, [groupId]: newGroup }));
    setCurrentGroupId(groupId);
    setGroupName('');
    setMode('lobby');
  };

  // ─── Join Group ──────────────────────────────────────────────
  const handleJoin = () => {
    if (!nameInput.trim() || !joinCode.trim()) {
      setError('Please fill in your name and the group code');
      return;
    }
    setError('');
    const name = nameInput.trim();
    const code = joinCode.trim().toUpperCase();

    // Find group by code
    const foundEntry = Object.entries(allGroups).find(([_, g]) => g.code === code);
    if (!foundEntry) {
      setError(`No group found with code "${code}"`);
      return;
    }

    const [gId, group] = foundEntry;

    // Check if already a member
    if (group.members.some(m => m.name === name)) {
      // Already a member, just open
      setUserNameStorage(name);
      setUserName(name);
      setCurrentGroupId(gId);
      setJoinCode('');
      setMode('lobby');
      return;
    }

    // Add member
    const updatedGroup: Group = {
      ...group,
      members: [...group.members, {
        id: Date.now().toString(),
        name,
        joinedAt: new Date().toISOString(),
      }],
      messages: [...group.messages, {
        id: `m-${Date.now()}`,
        senderName: 'System',
        text: `${name} joined the group!`,
        sentAt: new Date().toISOString(),
      }],
    };

    setUserNameStorage(name);
    setUserName(name);
    setAllGroups(prev => ({ ...prev, [gId]: updatedGroup }));
    setCurrentGroupId(gId);
    setJoinCode('');
    setMode('lobby');
  };

  // ─── Send Message ────────────────────────────────────────────
  const sendMessage = () => {
    if (!msgInput.trim() || !currentGroupId || !currentGroup) return;

    const msg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderName: userName,
      text: msgInput.trim(),
      sentAt: new Date().toISOString(),
    };

    setAllGroups(prev => ({
      ...prev,
      [currentGroupId]: {
        ...prev[currentGroupId],
        messages: [...prev[currentGroupId].messages, msg],
      }
    }));
    setMsgInput('');
  };

  // ─── Add Note ────────────────────────────────────────────────
  const addNote = () => {
    if (!noteTitle.trim() || !currentGroupId || !currentGroup) return;

    const note: GroupNote = {
      id: `n-${Date.now()}`,
      name: noteTitle.trim(),
      content: noteContent,
      authorName: userName,
      createdAt: new Date().toISOString(),
    };

    setAllGroups(prev => ({
      ...prev,
      [currentGroupId]: {
        ...prev[currentGroupId],
        notes: [...prev[currentGroupId].notes, note],
      }
    }));
    setNoteTitle('');
    setNoteContent('');
    setShowNoteForm(false);
  };

  // ─── Delete Note ─────────────────────────────────────────────
  const deleteNote = (noteId: string) => {
    if (!currentGroupId) return;
    setAllGroups(prev => ({
      ...prev,
      [currentGroupId]: {
        ...prev[currentGroupId],
        notes: prev[currentGroupId].notes.filter(n => n.id !== noteId),
      }
    }));
  };

  // ─── Leave Group ─────────────────────────────────────────────
  const leaveGroup = () => {
    if (!currentGroupId || !currentGroup) return;
    const updatedMembers = currentGroup.members.filter(m => m.name !== userName);
    
    if (updatedMembers.length === 0) {
      // Last member — delete group
      setAllGroups(prev => {
        const next = { ...prev };
        delete next[currentGroupId];
        return next;
      });
    } else {
      setAllGroups(prev => ({
        ...prev,
        [currentGroupId]: {
          ...prev[currentGroupId],
          members: updatedMembers,
          messages: [...prev[currentGroupId].messages, {
            id: `m-${Date.now()}`,
            senderName: 'System',
            text: `${userName} left the group.`,
            sentAt: new Date().toISOString(),
          }],
        }
      }));
    }
    setCurrentGroupId(null);
  };

  // ─── Copy Code ───────────────────────────────────────────────
  const copyCode = () => {
    if (!currentGroup) return;
    navigator.clipboard.writeText(currentGroup.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Format time
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ═══════════════════════════════════════════════════════════════
  // LOBBY VIEW (No group selected)
  // ═══════════════════════════════════════════════════════════════
  if (!currentGroup) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-12 rounded-[2.5rem] max-w-2xl w-full text-center space-y-8 border border-white/10 shadow-2xl"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Group Space</h1>
            <p className="text-gray-400">Create or join a group to collaborate, share notes, and chat.</p>
          </div>

          {mode === 'lobby' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setMode('create'); setError(''); }}
                className="flex-1 bg-primary text-background font-bold py-4 rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-shadow flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Group
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setMode('join'); setError(''); }}
                className="flex-1 glass font-bold py-4 rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Join Group
              </motion.button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode !== 'lobby' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-white/10 overflow-hidden"
              >
                {/* Name input (always shown) */}
                <input 
                  type="text" 
                  placeholder="Your Display Name" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-primary/50 transition-colors"
                />

                {mode === 'create' ? (
                  <>
                    <input 
                      type="text" 
                      placeholder="Group Name (e.g. Study Squad)" 
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-primary/50 transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleCreate}
                      disabled={!nameInput.trim() || !groupName.trim()}
                      className="w-full bg-primary text-background font-bold py-4 rounded-xl disabled:opacity-40 transition-opacity"
                    >
                      Confirm Creation
                    </motion.button>
                  </>
                ) : (
                  <>
                    <input 
                      type="text" 
                      placeholder="Enter Group Code" 
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none focus:border-primary/50 text-center text-2xl font-bold tracking-widest uppercase transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleJoin}
                      disabled={!nameInput.trim() || !joinCode.trim()}
                      className="w-full bg-primary text-background font-bold py-4 rounded-xl disabled:opacity-40 transition-opacity"
                    >
                      Join Now
                    </motion.button>
                  </>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-2 text-red-400 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={() => { setMode('lobby'); setError(''); }} 
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Previously joined groups */}
          {Object.keys(allGroups).length > 0 && mode === 'lobby' && (
            <div className="pt-6 border-t border-white/5">
              <p className="text-xs text-gray-600 uppercase tracking-widest font-bold mb-4">Your Groups</p>
              <div className="space-y-2">
                {Object.values(allGroups)
                  .filter(g => g.members.some(m => m.name === userName))
                  .map(g => (
                    <motion.button
                      key={g.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setCurrentGroupId(g.id)}
                      className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/20 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold">
                          {g.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{g.name}</p>
                          <p className="text-[10px] text-gray-500">{g.members.length} members</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{g.code}</span>
                    </motion.button>
                  ))
                }
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // GROUP VIEW (Inside a group)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary/20">
            {currentGroup.name[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{currentGroup.name}</h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
              <Users className="w-4 h-4" />
              <span>{currentGroup.members.length} Members</span>
              <span className="mx-1">•</span>
              <button 
                onClick={copyCode}
                className="bg-white/10 px-2.5 py-0.5 rounded font-mono text-primary hover:bg-white/15 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {currentGroup.code}
                {codeCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
              {codeCopied && <span className="text-green-400 text-xs">Copied!</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setCurrentGroupId(null); }}
            className="glass p-2.5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title="Back to lobby"
          >
            ← Back
          </button>
          <button 
            onClick={leaveGroup}
            className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2.5 rounded-xl font-bold hover:bg-red-500/20 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </button>
        </div>
      </motion.header>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
        {(['chat', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all flex items-center gap-2",
              activeTab === tab ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab === 'chat' ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content — 3 cols */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {/* ─── Chat Tab ─────────────────────────────── */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-2xl border border-white/10 flex flex-col"
                style={{ height: '65vh' }}
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  {currentGroup.messages.map((msg) => {
                    const isMe = msg.senderName === userName;
                    const isSystem = msg.senderName === 'System';
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-[10px] text-gray-600 bg-white/5 px-3 py-1 rounded-full">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                          {!isMe && (
                            <p className="text-[10px] text-gray-500 font-bold mb-1 ml-3">{msg.senderName}</p>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMe
                              ? 'bg-primary text-background rounded-br-md font-medium'
                              : 'bg-white/5 text-white rounded-bl-md border border-white/5'
                          }`}>
                            {msg.text}
                          </div>
                          <p className={`text-[9px] text-gray-600 mt-1 ${isMe ? 'text-right mr-3' : 'ml-3'}`}>
                            {formatTime(msg.sentAt)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={sendMessage}
                      disabled={!msgInput.trim()}
                      className="bg-primary text-background p-3 rounded-xl disabled:opacity-40 transition-opacity"
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Notes Tab ────────────────────────────── */}
            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Add Note Button / Form */}
                <AnimatePresence>
                  {showNoteForm ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="glass rounded-2xl p-5 border border-white/10 space-y-3 overflow-hidden"
                    >
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="Note title..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm font-bold transition-colors"
                        autoFocus
                      />
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Write your note content here..."
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm resize-none transition-colors"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={addNote}
                          disabled={!noteTitle.trim()}
                          className="px-5 py-2.5 bg-primary text-background font-bold rounded-xl text-sm disabled:opacity-40"
                        >
                          Save Note
                        </motion.button>
                        <button
                          onClick={() => { setShowNoteForm(false); setNoteTitle(''); setNoteContent(''); }}
                          className="px-5 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setShowNoteForm(true)}
                      className="w-full glass rounded-2xl p-4 border border-dashed border-white/10 hover:border-primary/30 text-gray-500 hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <FilePlus className="w-4 h-4" />
                      Add a Note
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Notes List */}
                {currentGroup.notes.length > 0 ? (
                  <div className="space-y-3">
                    {currentGroup.notes.map((note, i) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-2xl p-5 border border-white/10 group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <h4 className="font-bold text-sm">{note.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">
                              by {note.authorName} • {formatTime(note.createdAt)}
                            </span>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {note.content && (
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/[0.02] rounded-xl p-4 font-mono">
                            {note.content}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-12 border border-white/10 text-center">
                    <FileText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No notes shared yet</p>
                    <p className="text-gray-600 text-xs mt-1">Click "Add a Note" to share with your group</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar — Members */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Members</h3>
            <div className="space-y-3">
              {currentGroup.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold border border-white/10">
                      {member.name[0]?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {member.name}
                      {member.name === userName && <span className="text-primary text-[10px] ml-1">(you)</span>}
                    </p>
                    {member.isOwner && (
                      <p className="text-[9px] text-yellow-500 uppercase font-bold tracking-wider">Owner</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Info */}
          <div className="glass p-6 rounded-2xl border border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Invite Others</h3>
            <p className="text-gray-400 text-xs mb-3">Share this code with your peers</p>
            <button
              onClick={copyCode}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center font-mono text-2xl font-bold text-primary tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
            >
              {currentGroup.code}
            </button>
            {codeCopied && (
              <p className="text-green-400 text-xs text-center mt-2 font-medium">✓ Copied to clipboard</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="glass p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold">Group Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xl font-bold text-primary">{currentGroup.messages.length}</p>
                <p className="text-[9px] text-gray-500 uppercase font-bold">Messages</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xl font-bold text-secondary">{currentGroup.notes.length}</p>
                <p className="text-[9px] text-gray-500 uppercase font-bold">Notes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
