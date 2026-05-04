/**
 * SYNAPSE — Unified Firestore Backend Service
 * ════════════════════════════════════════════════════════════════
 * Provides a single API layer for all data persistence.
 * - Authenticated users → Firestore (real-time, cross-device)
 * - Guest users → localStorage fallback
 * 
 * Collections:
 *   users/{uid}                    → user profile & settings
 *   users/{uid}/tasks/{taskId}     → task documents
 *   users/{uid}/habits/{habitId}   → habit documents
 *   users/{uid}/timetable/current  → daily log data
 *   users/{uid}/timetable/history  → daily history records
 *   users/{uid}/calendar/{eventId} → calendar events
 *   users/{uid}/focusSessions/{id} → focus mode session records
 *   groups/{code}                  → group workspace documents
 *   groups/{code}/messages/{msgId} → chat messages
 *   groups/{code}/notes/{noteId}   → shared notes
 */

import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp,
  writeBatch, Timestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { User } from 'firebase/auth';

// ─── Type Definitions ────────────────────────────────────────────

export interface TaskDoc {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'backlog';
  priority: 'low' | 'medium' | 'high';
  originalPriority: string;
  type: 'Reading' | 'Coding' | 'Writing' | 'Research';
  deadline: string;
  aiSuggested?: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface HabitDoc {
  id: string;
  name: string;
  color: string;
  ticks: boolean[];
  month: number;
  year: number;
  createdAt: any;
}

export interface TimetableDoc {
  targetStudy: number;
  targetSleep: number;
  maxWaste: number;
  classSlots: { id: string; subject: string; startTime: string; endTime: string }[];
  studyHours: number;
  sleepHours: number;
  activities: { id: string; name: string; hours: number }[];
  updatedAt: any;
}

export interface DailyRecord {
  date: string;
  score: number;
  classesHrs: number;
  studyHrs: number;
  sleepHrs: number;
  playHrs: number;
  wastedHrs: number;
  isProductive: boolean;
  timestamp: any;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  type: 'event' | 'task' | 'class';
  color?: string;
  createdAt: any;
}

export interface FocusSession {
  id: string;
  duration: number; // seconds
  avgScore: number;
  startedAt: any;
  endedAt: any;
}

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  theme: string;
  notifications: { email: boolean; push: boolean };
  language: string;
  createdAt: any;
  lastLogin: any;
}

// ─── Helper: Get current UID ─────────────────────────────────────

function getUid(): string | null {
  return auth.currentUser?.uid || null;
}

function requireUid(): string {
  const uid = getUid();
  if (!uid) throw new Error('User not authenticated');
  return uid;
}

// ─── User Profile ────────────────────────────────────────────────

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const uid = requireUid();
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...profile,
    lastLogin: serverTimestamp(),
  }, { merge: true });
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const uid = getUid();
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function onUserProfile(callback: (profile: UserProfile | null) => void): () => void {
  const uid = getUid();
  if (!uid) { callback(null); return () => {}; }
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

// ─── Tasks ───────────────────────────────────────────────────────

export async function saveTasks(tasks: TaskDoc[]): Promise<void> {
  const uid = requireUid();
  const batch = writeBatch(db);
  
  // Delete existing tasks first
  const existingSnap = await getDocs(collection(db, 'users', uid, 'tasks'));
  existingSnap.forEach(d => batch.delete(d.ref));
  
  // Write all current tasks
  tasks.forEach(task => {
    const ref = doc(db, 'users', uid, 'tasks', task.id);
    batch.set(ref, {
      ...task,
      updatedAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
}

export async function getTasks(): Promise<TaskDoc[]> {
  const uid = getUid();
  if (!uid) return [];
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDoc));
}

export function onTasks(callback: (tasks: TaskDoc[]) => void): () => void {
  const uid = getUid();
  if (!uid) { callback([]); return () => {}; }
  return onSnapshot(
    query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDoc)))
  );
}

export async function addTask(task: Omit<TaskDoc, 'createdAt' | 'updatedAt'>): Promise<void> {
  const uid = requireUid();
  const ref = doc(db, 'users', uid, 'tasks', task.id);
  await setDoc(ref, {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(taskId: string, data: Partial<TaskDoc>): Promise<void> {
  const uid = requireUid();
  const ref = doc(db, 'users', uid, 'tasks', taskId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTask(taskId: string): Promise<void> {
  const uid = requireUid();
  await deleteDoc(doc(db, 'users', uid, 'tasks', taskId));
}

// ─── Habits ──────────────────────────────────────────────────────

export async function saveHabits(habits: HabitDoc[]): Promise<void> {
  const uid = requireUid();
  const batch = writeBatch(db);
  
  const existingSnap = await getDocs(collection(db, 'users', uid, 'habits'));
  existingSnap.forEach(d => batch.delete(d.ref));
  
  habits.forEach(habit => {
    const ref = doc(db, 'users', uid, 'habits', habit.id);
    batch.set(ref, habit);
  });
  
  await batch.commit();
}

export async function getHabits(): Promise<HabitDoc[]> {
  const uid = getUid();
  if (!uid) return [];
  const snap = await getDocs(collection(db, 'users', uid, 'habits'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as HabitDoc));
}

export function onHabits(callback: (habits: HabitDoc[]) => void): () => void {
  const uid = getUid();
  if (!uid) { callback([]); return () => {}; }
  return onSnapshot(
    collection(db, 'users', uid, 'habits'),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as HabitDoc)))
  );
}

// ─── Timetable / Daily Log ───────────────────────────────────────

export async function saveTimetable(data: TimetableDoc): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid, 'timetable', 'current'), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getTimetable(): Promise<TimetableDoc | null> {
  const uid = getUid();
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'timetable', 'current'));
  return snap.exists() ? (snap.data() as TimetableDoc) : null;
}

export async function saveDailyHistory(records: DailyRecord[]): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(db, 'users', uid, 'timetable', 'history'), {
    records,
    updatedAt: serverTimestamp(),
  });
}

export async function getDailyHistory(): Promise<DailyRecord[]> {
  const uid = getUid();
  if (!uid) return [];
  const snap = await getDoc(doc(db, 'users', uid, 'timetable', 'history'));
  return snap.exists() ? (snap.data()?.records || []) : [];
}

// ─── Calendar Events ─────────────────────────────────────────────

export async function saveCalendarEvents(events: CalendarEvent[]): Promise<void> {
  const uid = requireUid();
  const batch = writeBatch(db);
  
  const existingSnap = await getDocs(collection(db, 'users', uid, 'calendar'));
  existingSnap.forEach(d => batch.delete(d.ref));
  
  events.forEach(evt => {
    const ref = doc(db, 'users', uid, 'calendar', evt.id);
    batch.set(ref, evt);
  });
  
  await batch.commit();
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const uid = getUid();
  if (!uid) return [];
  const snap = await getDocs(collection(db, 'users', uid, 'calendar'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
}

// ─── Focus Sessions ──────────────────────────────────────────────

export async function saveFocusSession(session: Omit<FocusSession, 'endedAt'>): Promise<void> {
  const uid = requireUid();
  const ref = doc(db, 'users', uid, 'focusSessions', session.id);
  await setDoc(ref, {
    ...session,
    endedAt: serverTimestamp(),
  });
}

export async function getFocusSessions(): Promise<FocusSession[]> {
  const uid = getUid();
  if (!uid) return [];
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'focusSessions'), orderBy('startedAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FocusSession));
}

// ─── Group Workspace (shared across users) ───────────────────────

export async function createGroup(groupData: {
  name: string;
  code: string;
  ownerName: string;
  members: any[];
}): Promise<void> {
  const ref = doc(db, 'groups', groupData.code);
  await setDoc(ref, {
    ...groupData,
    createdAt: serverTimestamp(),
  });
}

export async function getGroup(code: string): Promise<any | null> {
  const snap = await getDoc(doc(db, 'groups', code));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateGroup(code: string, data: any): Promise<void> {
  await updateDoc(doc(db, 'groups', code), data);
}

export function onGroup(code: string, callback: (group: any) => void): () => void {
  return onSnapshot(doc(db, 'groups', code), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function addGroupMessage(code: string, message: any): Promise<void> {
  const ref = doc(collection(db, 'groups', code, 'messages'));
  await setDoc(ref, {
    ...message,
    sentAt: serverTimestamp(),
  });
}

export function onGroupMessages(code: string, callback: (messages: any[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'groups', code, 'messages'), orderBy('sentAt', 'asc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function addGroupNote(code: string, note: any): Promise<void> {
  const ref = doc(collection(db, 'groups', code, 'notes'));
  await setDoc(ref, {
    ...note,
    createdAt: serverTimestamp(),
  });
}

export function onGroupNotes(code: string, callback: (notes: any[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'groups', code, 'notes'), orderBy('createdAt', 'desc')),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ─── Sync Engine: localStorage ↔ Firestore ──────────────────────

const SYNC_KEYS = {
  tasks: 'synapse-tasks-store',
  habits: 'synapse_habits',
  timetableHistory: 'synapse-daily-history',
  calendarEvents: 'synapse-calendar-events',
  settings: 'synapse-notif-settings',
  groups: 'synapse-groups',
};

const BACKEND_BASE_URL = localStorage.getItem('synapse-backend-url') || 'http://localhost:8080';
const BACKEND_TOKEN_KEY = 'synapse-backend-token';

type BackendLocalState = {
  tasks: any[];
  groups: Record<string, any>;
  updatedAt: string | null;
};

function readJsonFromStorage<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

async function backendRequest(path: string, init: RequestInit = {}): Promise<any | null> {
  const token = localStorage.getItem(BACKEND_TOKEN_KEY);
  if (!token) return null;

  try {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(BACKEND_TOKEN_KEY);
      }
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

async function pushLocalStateToBackend(): Promise<number> {
  const payload: BackendLocalState = {
    tasks: readJsonFromStorage<any[]>(SYNC_KEYS.tasks, []),
    groups: readJsonFromStorage<Record<string, any>>(SYNC_KEYS.groups, {}),
    updatedAt: new Date().toISOString(),
  };

  const result = await backendRequest('/api/sync/local-state', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!result?.ok) return 0;
  return payload.tasks.length + Object.keys(payload.groups).length;
}

async function pullLocalStateFromBackend(): Promise<number> {
  const result = await backendRequest('/api/sync/local-state');
  const state = result?.state as BackendLocalState | undefined;
  if (!state) return 0;

  if (Array.isArray(state.tasks)) {
    localStorage.setItem(SYNC_KEYS.tasks, JSON.stringify(state.tasks));
  }

  if (state.groups && typeof state.groups === 'object') {
    localStorage.setItem(SYNC_KEYS.groups, JSON.stringify(state.groups));
  }

  return (Array.isArray(state.tasks) ? state.tasks.length : 0) + (state.groups ? Object.keys(state.groups).length : 0);
}

/**
 * Upload all localStorage data to Firestore for current user.
 * Called once after login to merge local data to cloud.
 */
export async function syncLocalToCloud(): Promise<number> {
  const uid = getUid();
  if (!uid) return 0;
  let synced = 0;

  // Prefer backend snapshot sync for tasks/groups so existing localStorage-driven
  // UI remains untouched while still persisting to backend.
  const backendSynced = await pushLocalStateToBackend();
  if (backendSynced > 0) {
    synced += backendSynced;
  }

  try {
    // Tasks
    const localTasks = JSON.parse(localStorage.getItem(SYNC_KEYS.tasks) || '[]');
    if (localTasks.length > 0) {
      await saveTasks(localTasks.map((t: any) => ({
        ...t,
        createdAt: t.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })));
      synced += localTasks.length;
    }

    // Habits
    const localHabits = JSON.parse(localStorage.getItem(SYNC_KEYS.habits) || '[]');
    if (localHabits.length > 0) {
      const now = new Date();
      await saveHabits(localHabits.map((h: any) => ({
        ...h,
        month: h.month ?? now.getMonth(),
        year: h.year ?? now.getFullYear(),
        createdAt: h.createdAt || serverTimestamp(),
      })));
      synced += localHabits.length;
    }

    // Daily history
    const localHistory = JSON.parse(localStorage.getItem(SYNC_KEYS.timetableHistory) || '[]');
    if (localHistory.length > 0) {
      await saveDailyHistory(localHistory);
      synced += localHistory.length;
    }

    // Calendar events
    const localEvents = JSON.parse(localStorage.getItem(SYNC_KEYS.calendarEvents) || '[]');
    if (localEvents.length > 0) {
      await saveCalendarEvents(localEvents);
      synced += localEvents.length;
    }

    // Settings
    const localSettings = JSON.parse(localStorage.getItem(SYNC_KEYS.settings) || '{}');
    await saveUserProfile({
      displayName: auth.currentUser?.displayName || 'User',
      email: auth.currentUser?.email || '',
      photoURL: auth.currentUser?.photoURL || undefined,
      theme: document.documentElement.getAttribute('data-theme') || 'dark',
      notifications: {
        email: localSettings.email ?? true,
        push: localSettings.push ?? false,
      },
      language: 'en',
      createdAt: serverTimestamp(),
    });
    synced++;

  } catch (error) {
    console.error('Sync local→cloud error:', error);
  }

  return synced;
}

/**
 * Download all Firestore data to localStorage for current user.
 * Called once after login to populate local state from cloud.
 */
export async function syncCloudToLocal(): Promise<number> {
  const uid = getUid();
  if (!uid) return 0;
  let synced = 0;

  // Pull backend snapshot first for localStorage-native modules (tasks/groups/notes).
  const backendPulled = await pullLocalStateFromBackend();
  if (backendPulled > 0) {
    synced += backendPulled;
  }

  try {
    const tasks = await getTasks();
    if (tasks.length > 0) {
      localStorage.setItem(SYNC_KEYS.tasks, JSON.stringify(tasks));
      synced += tasks.length;
    }

    const habits = await getHabits();
    if (habits.length > 0) {
      localStorage.setItem(SYNC_KEYS.habits, JSON.stringify(habits));
      synced += habits.length;
    }

    const history = await getDailyHistory();
    if (history.length > 0) {
      localStorage.setItem(SYNC_KEYS.timetableHistory, JSON.stringify(history));
      synced += history.length;
    }

    const events = await getCalendarEvents();
    if (events.length > 0) {
      localStorage.setItem(SYNC_KEYS.calendarEvents, JSON.stringify(events));
      synced += events.length;
    }

    const profile = await getUserProfile();
    if (profile) {
      if (profile.notifications) {
        localStorage.setItem(SYNC_KEYS.settings, JSON.stringify(profile.notifications));
      }
      synced++;
    }

  } catch (error) {
    console.error('Sync cloud→local error:', error);
  }

  return synced;
}

/**
 * Auto-sync: debounced save to Firestore whenever localStorage changes.
 * Starts a mutation observer that catches setItem calls.
 */
export function startAutoSync(): () => void {
  const uid = getUid();
  if (!uid) return () => {};

  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  
  const debouncedSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try {
        await syncLocalToCloud();
      } catch (e) {
        console.warn('Auto-sync failed:', e);
      }
    }, 5000); // 5s debounce
  };

  // Override localStorage.setItem to detect changes
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (Object.values(SYNC_KEYS).includes(key)) {
      debouncedSync();
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key && Object.values(SYNC_KEYS).includes(event.key)) {
      debouncedSync();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    if (syncTimer) clearTimeout(syncTimer);
    localStorage.setItem = originalSetItem;
    window.removeEventListener('storage', onStorage);
  };
}
