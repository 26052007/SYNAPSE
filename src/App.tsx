import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Bell, Search, LogIn, LogOut, Menu, Brain, Zap, Cloud
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout } from './firebase';
import { syncCloudToLocal, syncLocalToCloud, startAutoSync } from './lib/backend';

// Components
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import TaskManagement from './components/TaskManagement';
import GroupWorkspace from './components/GroupWorkspace';
import SyllabusParser from './components/SyllabusParser';
import CalendarView from './components/CalendarView';
import FocusMode from './components/FocusMode';
import CodeforcesPage from './components/Codeforces';
import HabitTracker from './components/HabitTracker';
import Timetable from './components/Timetable';
import Intro from './components/Intro';
import NeuralBackground from './components/NeuralBackground';
import Settings from './components/Settings';
import MegaMenu from './components/MegaMenu';
import CognitiveGames from './components/CognitiveGames';
import LanguageSettings from './components/LanguageSettings';
import StudyVault from './components/StudyVault';
import { SynapseLogo } from './components/SynapseLogo';

type Page = 'dashboard' | 'tasks' | 'calendar' | 'focus' | 'habits' | 'timetable' | 'codeforces' | 'group' | 'vault' | 'syllabus' | 'settings' | 'games' | 'language' | 'landing';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [showIntro, setShowIntro] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const autoSyncCleanup = useRef<(() => void) | null>(null);

  const guestName = 'Student';

  // Auth listener + cloud sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // User just logged in → pull cloud data, then start auto-sync
        setSyncStatus('Syncing from cloud...');
        try {
          const pulled = await syncCloudToLocal();
          if (pulled === 0) {
            // No cloud data — push local data up
            const pushed = await syncLocalToCloud();
            setSyncStatus(`Uploaded ${pushed} items`);
            setLastSyncAt(new Date());
          } else {
            setSyncStatus(`Synced ${pulled} items`);
            setLastSyncAt(new Date());
          }
          // Start auto-sync watcher
          autoSyncCleanup.current = startAutoSync();
        } catch (e) {
          console.error('Sync error:', e);
          setSyncStatus('Sync failed');
        }
        setTimeout(() => setSyncStatus(null), 3000);
        setCurrentPage('dashboard');
      } else {
        // Logged out → stop auto-sync
        if (autoSyncCleanup.current) {
          autoSyncCleanup.current();
          autoSyncCleanup.current = null;
        }
      }
    });
    return () => {
      unsubscribe();
      if (autoSyncCleanup.current) autoSyncCleanup.current();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Lightweight backend health signal for header status.
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const backendBase = localStorage.getItem('synapse-backend-url') || 'http://localhost:8080';

    const checkBackend = async () => {
      if (!user) {
        if (mounted) setBackendOnline(null);
        return;
      }
      try {
        const res = await fetch(`${backendBase}/api/health`);
        if (mounted) setBackendOnline(res.ok);
      } catch {
        if (mounted) setBackendOnline(false);
      }
    };

    checkBackend();
    timer = setInterval(checkBackend, 30000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [user]);

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  if (currentPage === 'landing' && !user && !isGuest) {
    return (
      <>
        <NeuralBackground intensity="subtle" />
        <Hero onGetStarted={() => { setIsGuest(true); setCurrentPage('dashboard'); }} />
        {/* Floating Login Buttons */}
        <div className="fixed top-8 right-8 z-50 flex items-center gap-3">
          <button 
            onClick={() => { setIsGuest(true); setCurrentPage('dashboard'); }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-5 py-3 rounded-xl font-bold hover:scale-105 transition-transform border border-white/20"
          >
            <Zap className="w-4 h-4" />
            Continue as Guest
          </button>
          <button 
            onClick={signInWithGoogle}
            className="flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-2xl"
          >
            <LogIn className="w-5 h-5" />
            Sign In with Google
          </button>
        </div>
      </>
    );
  }

  const pageTitle: Record<Page, string> = {
    dashboard: 'Dashboard',
    tasks: 'Task Matrix',
    calendar: 'Calendar',
    focus: 'Focus Mode',
    habits: 'Neural Habits',
    timetable: 'Time-Table & Inputs',
    codeforces: 'Codeforces',
    group: 'Group Space',
    vault: 'Study Vault',
    syllabus: 'AI Parser',
    settings: 'Settings',
    games: 'Cognitive Training',
    language: 'Global Directives',
    landing: '',
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Neural Network Background (subtle) */}
      <NeuralBackground intensity="subtle" />

      {/* Mega Menu Overlay */}
      <MegaMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onNavigate={(page) => setCurrentPage(page as Page)} 
      />
      
      {/* Fixed Top HUD */}
      <header className="fixed top-0 left-0 right-0 z-[8000] h-16 flex items-center justify-between px-6" 
        style={{ background: 'linear-gradient(to bottom, rgba(5,5,8,0.9) 0%, transparent 100%)', pointerEvents: 'none' }}>
        <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
          {/* Dashboard Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCurrentPage('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-[2px] uppercase transition-all backdrop-blur-sm border ${
              currentPage === 'dashboard'
                ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            DASHBOARD
          </motion.button>

          {/* Menu Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsMenuOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-[2px] uppercase transition-all backdrop-blur-sm border ${
              isMenuOpen
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Menu className="w-4 h-4" />
            MENU
          </motion.button>
        </div>

        <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
          {/* Current page indicator */}
          {currentPage !== 'dashboard' && currentPage !== 'landing' && (
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-[2px]">
              {pageTitle[currentPage]}
            </div>
          )}

          {/* Backend/sync indicator for signed-in users */}
          {user && (
            <div
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-[1.5px] ${
                backendOnline === null
                  ? 'bg-white/5 border-white/10 text-gray-400'
                  : backendOnline
                    ? 'bg-green-500/5 border-green-500/20 text-green-400'
                    : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}
              title={syncStatus || 'Realtime backend sync status'}
            >
              {syncStatus || (backendOnline ? 'Backend Live' : backendOnline === false ? 'Backend Offline' : 'Checking Backend')}
              {backendOnline && (
                <span className="ml-2 text-[9px] opacity-80 normal-case tracking-normal">
                  Last sync: {formatLastSync(lastSyncAt)}
                </span>
              )}
            </div>
          )}

          {/* User info */}
          {user ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              <span className="text-green-400 text-xs font-bold tracking-wider uppercase">{user.displayName?.split(' ')[0] || 'User'}</span>
            </div>
          ) : isGuest ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
              <span className="text-primary text-xs font-bold tracking-wider uppercase">{guestName}</span>
            </div>
          ) : null}

          {/* Logout / Exit */}
          <button
            onClick={() => {
              if (user) logout();
              setIsGuest(false);
              setCurrentPage('landing');
            }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-all"
            title={user ? 'Logout' : 'Exit'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 16, scale: 0.99, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, scale: 0.99, filter: "blur(4px)" }}
            transition={{ 
              duration: 0.45, 
              ease: [0.16, 1, 0.3, 1],
              filter: { duration: 0.3 }
            }}
            className="min-h-full"
          >
            {currentPage === 'dashboard' && <DashboardHome onNavigate={(page) => setCurrentPage(page as Page)} />}
            {currentPage === 'tasks' && <TaskManagement />}
            {currentPage === 'calendar' && <CalendarView />}
            {currentPage === 'focus' && <FocusMode />}
            {currentPage === 'habits' && <HabitTracker />}
            {currentPage === 'timetable' && <Timetable />}
            {currentPage === 'codeforces' && <CodeforcesPage />}
            {currentPage === 'group' && <GroupWorkspace />}
            {currentPage === 'vault' && <StudyVault />}
            {currentPage === 'syllabus' && <SyllabusParser />}
            {currentPage === 'settings' && <Settings theme={theme} setTheme={setTheme} />}
            {currentPage === 'games' && <CognitiveGames />}
            {currentPage === 'language' && <LanguageSettings />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Dashboard Home (centered landing with logo) ─────────────────
function DashboardHome({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] relative px-8">
      {/* Massive centered logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-8"
      >
        <SynapseLogo size={80} showText={false} className="justify-center mb-6" />
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-white mb-3"
          style={{ textShadow: '0 0 40px rgba(0,242,255,0.3), 0 0 80px rgba(0,242,255,0.1)' }}>
          SYNAPSE
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-sm uppercase tracking-[8px] text-gray-500 font-bold"
        >
          NEURAL CORE ACTIVE
        </motion.p>
      </motion.div>

      {/* Quick access cards */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full"
      >
        {[
          { id: 'focus', label: 'Focus', color: '#00f2ff' },
          { id: 'habits', label: 'Habits', color: '#22c55e' },
          { id: 'timetable', label: 'Daily Log', color: '#3b82f6' },
          { id: 'codeforces', label: 'Codeforces', color: '#7000ff' },
        ].map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.1 }}
            whileHover={{ scale: 1.05, borderColor: item.color }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(item.id)}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all backdrop-blur-sm"
          >
            {item.label}
          </motion.button>
        ))}
      </motion.div>

      {/* About corner */}
      <div className="fixed bottom-6 right-6 text-right">
        <p className="text-[10px] text-primary/60 font-bold tracking-wider uppercase">ABOUT US</p>
        <p className="text-[9px] text-gray-600">Architected for Hackathon 2026.</p>
      </div>
    </div>
  );
}
