import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, Sparkles, Upload, FileText, Brain, CheckCircle2, X
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────
type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'event' | 'task' | 'class';
  status?: string;
  color?: string;
  subjectId?: string;
  attendance?: 'pending' | 'present' | 'absent';
};

type SyllabusSubject = {
  id: string;
  name: string;
  days: string[]; // e.g. ['Mon', 'Wed']
  time: string;
  createdAt: number;
};

// ─── Storage ─────────────────────────────────────────────────────
const EVENTS_KEY = 'synapse-calendar-events';
const TASKS_KEY = 'synapse-tasks-store';
const SUBJECTS_KEY = 'synapse-syllabus-subjects';
const BACKEND_BASE_URL = localStorage.getItem('synapse-backend-url') || 'http://localhost:8080';
const AI_MODEL_STORAGE = 'synapse-vault-gemini-model';

function loadEvents(): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); } catch { return []; }
}
function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}
function loadLocalTasks(): any[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); } catch { return []; }
}
function loadSubjects(): SyllabusSubject[] {
  try { return JSON.parse(localStorage.getItem(SUBJECTS_KEY) || '[]'); } catch { return []; }
}
function saveSubjects(subs: SyllabusSubject[]) {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subs));
}

// ─── Color palette for events ────────────────────────────────────
const EVENT_COLORS = ['#00f2ff', '#7000ff', '#ff00c8', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [subjects, setSubjects] = useState<SyllabusSubject[]>(loadSubjects);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState<'event' | 'class'>('event');

  // Syllabus tracker state
  const [newSubName, setNewSubName] = useState('');
  const [newSubDays, setNewSubDays] = useState<string[]>([]);
  const [newSubTime, setNewSubTime] = useState('');
  const [googleSyncStatus, setGoogleSyncStatus] = useState<string | null>(null);

  // Persist events & subjects
  useEffect(() => { saveEvents(events); }, [events]);
  useEffect(() => { saveSubjects(subjects); }, [subjects]);

  // Merge tasks from Task Management into calendar
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => {
    // Load tasks from localStorage (shared with TaskManagement)
    const loadTasks = () => {
      const stored = loadLocalTasks();
      setTasks(stored);
    };
    loadTasks();
    // Poll for task changes every 2 seconds
    const interval = setInterval(loadTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  // Convert tasks to calendar events format
  const taskEvents: CalendarEvent[] = tasks
    .filter(t => t.deadline || t.dueDate)
    .map(t => ({
      id: `task-${t.id}`,
      title: t.title || t.name,
      date: (t.deadline || t.dueDate || '').split('T')[0],
      type: 'task' as const,
      status: t.status,
      color: t.status === 'done' ? '#22c55e' : '#f59e0b',
    }));

  // Combined events
  const allEvents = [...events, ...taskEvents];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days: (number | null)[] = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // ─── Events Logic ──────────────────────────────────────────────
  const handleAddEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    const event: CalendarEvent = {
      id: `e-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime || undefined,
      type: newType,
      color: EVENT_COLORS[events.length % EVENT_COLORS.length],
    };
    setEvents(prev => [...prev, event]);
    setNewTitle('');
    setNewDate('');
    setNewTime('');
    setShowAddModal(false);
  };

  const handleAddSubject = () => {
    if (!newSubName.trim() || newSubDays.length === 0 || !newSubTime) return;
    const subject: SyllabusSubject = { id: `sub-${Date.now()}`, name: newSubName.trim(), days: newSubDays, time: newSubTime, createdAt: Date.now() };
    setSubjects(prev => [...prev, subject]);
    
    const curr = new Date();
    const endDate = new Date(curr.getTime() + 1000 * 60 * 60 * 24 * 120); // next 120 days
    const newEvents: CalendarEvent[] = [];
    const daysMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    
    for (let d = new Date(curr); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStr = Object.keys(daysMap).find(k => daysMap[k] === d.getDay());
        if (dayStr && newSubDays.includes(dayStr)) {
            newEvents.push({
                id: `cls-${subject.id}-${d.getTime()}`,
                title: subject.name,
                date: new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0],
                time: subject.time,
                type: 'class',
                color: EVENT_COLORS[subjects.length % EVENT_COLORS.length],
                subjectId: subject.id,
                attendance: 'pending'
            });
        }
    }
    setEvents(prev => [...prev, ...newEvents]);
    setNewSubName('');
    setNewSubDays([]);
    setNewSubTime('');
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const markAttendance = (eventId: string, status: 'present' | 'absent') => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendance: status } : e));
  };

  // ─── Open add modal with pre-filled date ──────────────────────
  const openAddForDate = (day: number) => {
    setNewDate(getDateStr(day));
    setShowAddModal(true);
  };

  const exportIcs = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Synapse//Calendar Sync//EN',
    ];
    for (const evt of allEvents) {
      const day = evt.date.replace(/-/g, '');
      const summary = (evt.title || 'Event').replace(/,/g, '\\,');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${evt.id}@synapse`,
        `DTSTAMP:${day}T000000Z`,
        `DTSTART;VALUE=DATE:${day}`,
        `DTEND;VALUE=DATE:${day}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:Synced from Synapse (${evt.type})`,
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'synapse-calendar.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const openGoogleCalendar = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const details = encodeURIComponent(
      `Synapse exported events: ${allEvents.length}\nDownload the .ics file and import to Google Calendar for full sync.`
    );
    window.open(
      `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent('Synapse Study Plan')}&dates=${today}/${today}&details=${details}`,
      '_blank',
      'noopener,noreferrer'
    );
    setGoogleSyncStatus('Opened Google Calendar and prepared export instructions.');
  };

  // ─── Timetable Upload with AI ──────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Analyzing timetable with AI...");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        
        const prompt = `Analyze this student timetable/schedule text and extract all subjects/classes with their days and times.
Return ONLY a valid JSON array (no markdown, no explanation) of objects with these exact fields:
- "title": subject/class name (string)
- "day": day of week like "Monday", "Tuesday", etc. (string)  
- "time": in HH:mm 24-hour format (string)
- "endTime": end time in HH:mm format (string, optional)

Example output: [{"title":"Mathematics","day":"Monday","time":"09:00","endTime":"10:00"}]

Timetable text:
${text}`;

        const response = await fetch(`${BACKEND_BASE_URL}/api/ai/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: prompt,
            model: localStorage.getItem(AI_MODEL_STORAGE) || 'gemini-flash-latest',
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Backend AI request failed (${response.status})`);
        }

        const body = await response.json();
        const rawText = typeof body?.answer === 'string' ? body.answer : '';
        const jsonText = rawText.replace(/```json|```/g, "").trim();
        
        let timetableData;
        try {
          timetableData = JSON.parse(jsonText);
        } catch {
          setUploadStatus("AI couldn't parse the timetable. Try a clearer format.");
          setIsUploading(false);
          return;
        }

        // Add each class as a recurring event for the current month
        let addedCount = 0;
        const daysMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };

        for (const entry of timetableData) {
          const targetDayIndex = daysMap[entry.day];
          if (targetDayIndex === undefined) continue;

          // Find all occurrences of this day in the current month
          for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d);
            if (date.getDay() === targetDayIndex) {
              const dateStr = getDateStr(d);
              // Don't add duplicates
              const exists = events.some(ev => ev.title === entry.title && ev.date === dateStr);
              if (!exists) {
                setEvents(prev => [...prev, {
                  id: `class-${Date.now()}-${d}-${addedCount}`,
                  title: entry.title,
                  date: dateStr,
                  time: entry.time,
                  type: 'class',
                  color: EVENT_COLORS[addedCount % EVENT_COLORS.length],
                }]);
                addedCount++;
              }
            }
          }
        }

        setUploadStatus(`✓ Added ${addedCount} class slots!`);
        setTimeout(() => setUploadStatus(null), 3000);
        setIsUploading(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error parsing timetable:", error);
      setUploadStatus("Error analyzing file.");
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-gray-400 text-sm">Your academic schedule, synced and visualized.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass p-1 rounded-xl flex items-center">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 font-bold min-w-[140px] text-center">
              {monthName} {year}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setNewDate(''); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-primary text-background px-4 py-2.5 rounded-xl font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </motion.button>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500 border-r border-white/5 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[110px]">
          {days.map((day, i) => {
            const dateStr = day ? getDateStr(day) : null;
            const dayEvents = allEvents.filter(e => e.date === dateStr);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div 
                key={i} 
                onClick={() => day && openAddForDate(day)}
                className={cn(
                  "p-1.5 border-r border-b border-white/5 last:border-r-0 relative group transition-colors cursor-pointer",
                  day ? "hover:bg-white/[0.03]" : "bg-white/[0.01] cursor-default"
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5",
                      isToday ? "bg-primary text-background" : "text-gray-500 group-hover:text-white"
                    )}>
                      {day}
                    </span>
                    
                    <div className="space-y-0.5 overflow-y-auto max-h-[72px] custom-scrollbar">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div 
                          key={ev.id}
                          className="text-[8px] px-1.5 py-0.5 rounded truncate flex items-center justify-between gap-1 group/evt"
                          style={{ 
                            background: `${ev.color || '#00f2ff'}15`,
                            borderLeft: `2px solid ${ev.color || '#00f2ff'}`,
                            color: ev.color || '#00f2ff',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate flex items-center gap-1">
                            {ev.type === 'task' ? <CheckCircle2 className="w-2 h-2 shrink-0" /> : <Clock className="w-2 h-2 shrink-0" />}
                            <span className="truncate">{ev.time ? `${ev.time} ` : ''}{ev.title}</span>
                          </span>
                          
                          {ev.subjectId && (
                            <div className="flex gap-1 opacity-0 group-hover/evt:opacity-100 transition-opacity shrink-0">
                               <button onClick={(e) => { e.stopPropagation(); markAttendance(ev.id, 'present'); }} className="text-green-500 hover:text-green-400 bg-white/10 rounded p-[1px] shadow-sm"><CheckCircle2 className="w-3 h-3" /></button>
                               <button onClick={(e) => { e.stopPropagation(); markAttendance(ev.id, 'absent'); }} className="text-red-500 hover:text-red-400 bg-white/10 rounded p-[1px] shadow-sm"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-gray-500 pl-1">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" />Events</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" />Tasks</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" />Done</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500" />Classes</div>
      </div>

      {/* Google Calendar Sync Section */}
      <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Sync With Google Calendar</h3>
            <p className="text-xs text-gray-400 max-w-md">
              Upload timetable text for AI extraction, then push all events directly to your Google Calendar.
            </p>
            {googleSyncStatus && <p className="text-[11px] text-primary mt-2">{googleSyncStatus}</p>}
          </div>
        </div>

        <div className="relative z-10 flex gap-2 flex-wrap justify-end">
          <label className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer",
            isUploading ? "bg-gray-500 cursor-wait" : "bg-white text-black hover:scale-105 active:scale-95"
          )}>
            {isUploading ? <Sparkles className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {uploadStatus || "Upload Timetable"}
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".txt,.csv"
            />
          </label>
          <button onClick={exportIcs} className="px-4 py-3 rounded-xl text-sm font-bold bg-primary text-background hover:opacity-90 transition-opacity">
            Export .ics
          </button>
          <button onClick={openGoogleCalendar} className="px-4 py-3 rounded-xl text-sm font-bold bg-white/10 border border-white/20 text-white">
            Open Google Calendar
          </button>
        </div>
      </div>

      {/* Attendance & Syllabus Tracker */}
      <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Syllabus & Attendance Tracker</h3>
          <p className="text-xs text-gray-400">Manage your recurring subjects and intelligently track the 75% attendance criteria.</p>
        </div>

        {/* Add Subject row */}
        <div className="flex flex-wrap items-center gap-3">
            <input type="text" placeholder="Subject Name..." value={newSubName} onChange={e => setNewSubName(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm w-full md:w-auto flex-1 transition-colors" />
            <input type="time" title="Class Timing" value={newSubTime} onChange={e => setNewSubTime(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm transition-colors cursor-pointer" />
            
            <div className="flex gap-1 border border-white/10 p-1 rounded-xl bg-white/5">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <button key={d} onClick={() => setNewSubDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} className={cn("px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all", newSubDays.includes(d) ? "bg-primary text-background shadow-md" : "text-gray-400 hover:text-white")}>{d}</button>
                ))}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAddSubject} disabled={!newSubName || newSubDays.length === 0 || !newSubTime} className="bg-primary text-background font-bold px-6 py-3 rounded-xl disabled:opacity-50 text-sm transition-all shadow-lg hover:shadow-primary/20 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Subject
            </motion.button>
        </div>

        {/* Subject Stats */}
        {subjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/5 pt-6 mt-6">
                {subjects.map(sub => {
                    const subEvents = events.filter(e => e.subjectId === sub.id);
                    const attended = subEvents.filter(e => e.attendance === 'present').length;
                    const missed = subEvents.filter(e => e.attendance === 'absent').length;
                    const taken = attended + missed;
                    const percent = taken > 0 ? Math.round((attended / taken) * 100) : 100;
                    
                    // Buffer calculation: minimum requirement is 75%
                    const buffer = Math.floor(attended / 3 - missed);
                    const shortfall = missed * 3 - attended; // if buffer < 0
                    
                    return (
                        <div key={sub.id} className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3 shadow-inner hover:bg-black/30 transition-colors relative overflow-hidden group">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors flex items-center gap-2">
                                      {sub.name}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{sub.days.join(', ')} <span className="text-gray-400">• {sub.time}</span></p>
                                </div>
                                <span className={cn("text-xs font-bold px-2 py-1 rounded bg-black/40 border", percent >= 75 ? "text-green-400 border-green-400/20" : "text-red-400 border-red-400/20")}>{percent}%</span>
                            </div>

                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative z-10">
                                <div className={cn("h-full rounded-full transition-all duration-1000", percent >= 75 ? "bg-gradient-to-r from-green-600 to-green-400" : "bg-gradient-to-r from-red-600 to-red-400")} style={{ width: `${percent}%` }} />
                            </div>

                            <div className="text-[10px] text-gray-400 flex items-center justify-between relative z-10">
                                <span className="flex items-center gap-2">
                                  <span className="text-green-400/80"><CheckCircle2 className="w-3 h-3 inline mr-0.5"/>{attended}</span>
                                  <span className="text-red-400/80"><X className="w-3 h-3 inline mr-0.5"/>{missed}</span>
                                </span>
                                <span className={cn("font-bold px-2 py-0.5 rounded", buffer > 0 ? "bg-green-500/10 text-green-400" : buffer === 0 ? "text-gray-300" : "bg-red-500/10 text-red-400")}>
                                    {taken === 0 ? "No classes yet" : buffer > 0 ? `Can bunk ${buffer} classes` : buffer === 0 ? "On track (75%)" : `Attend ${shortfall} more to fix`}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4"
              style={{ background: 'rgba(10,10,15,0.95)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Add Event
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Event title..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm transition-colors"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 text-sm transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Time (optional)</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 text-sm transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['event', 'class'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                        newType === type
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAddEvent}
                disabled={!newTitle.trim() || !newDate}
                className="w-full bg-primary text-background font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-opacity"
              >
                Add to Calendar
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
