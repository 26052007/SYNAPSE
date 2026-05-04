import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Plus, Trash2, Clock, BookOpen, Moon,
  Gamepad2, AlertTriangle, CheckCircle, BarChart3, TrendingUp
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

// ─── Types ───────────────────────────────────────────────────────
interface ClassSlot {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
}

interface PlayActivity {
  id: string;
  name: string;
  hours: number;
}

interface AnalysisResult {
  classesHrs: number;
  studyHrs: number;
  sleepHrs: number;
  playHrs: number;
  wastedHrs: number;
  totalUnproductive: number;
  isProductive: boolean;
  maxWaste: number;
  productivityScore: number;
  extraSleep: number;
}

interface DailyRecord {
  date: string;
  score: number;
  classesHrs: number;
  studyHrs: number;
  sleepHrs: number;
  playHrs: number;
  wastedHrs: number;
  isProductive: boolean;
}

// ─── Storage ─────────────────────────────────────────────────────
const STORAGE_KEY = 'synapse-timetable';
const HISTORY_KEY = 'synapse-daily-history';

function loadHistory(): DailyRecord[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(data: DailyRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
}

// ─── Custom Chart Tooltip ────────────────────────────────────────
function ChartTip({ active, payload }: any) {
  if (active && payload?.[0]) {
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10" style={{ background: 'rgba(10,10,15,0.9)' }}>
        <p className="font-bold" style={{ color: payload[0].payload.fill || payload[0].color }}>{payload[0].name}</p>
        <p className="text-white">{payload[0].value.toFixed(1)} hrs</p>
      </div>
    );
  }
  return null;
}

function BarTip({ active, payload, label }: any) {
  if (active && payload?.[0]) {
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10" style={{ background: 'rgba(10,10,15,0.9)' }}>
        <p className="font-bold text-white">{label}</p>
        <p style={{ color: '#c8a44e' }}>Score: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────
export default function Timetable() {
  // Targets
  const [targetStudy, setTargetStudy] = useState(6);
  const [targetSleep, setTargetSleep] = useState(8);
  const [maxWaste, setMaxWaste] = useState(3);

  // Daily actuals
  const [classSlots, setClassSlots] = useState<ClassSlot[]>([
    { id: '1', subject: '', startTime: '', endTime: '' }
  ]);
  const [studyHours, setStudyHours] = useState<number | ''>('');
  const [sleepHours, setSleepHours] = useState<number | ''>('');

  // Play activities
  const [activities, setActivities] = useState<PlayActivity[]>([
    { id: '1', name: '', hours: 0 }
  ]);

  // Analysis
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [history, setHistory] = useState<DailyRecord[]>(loadHistory);

  // Calculate total class duration from time slots
  const totalClassHrs = useMemo(() => {
    let total = 0;
    classSlots.forEach(slot => {
      if (slot.startTime && slot.endTime) {
        const [sH, sM] = slot.startTime.split(':').map(Number);
        const [eH, eM] = slot.endTime.split(':').map(Number);
        let duration = (eH + eM / 60) - (sH + sM / 60);
        if (duration < 0) duration += 24; // Handle overnight
        total += duration;
      }
    });
    return total;
  }, [classSlots]);

  // Class slot management
  const addClassSlot = () => setClassSlots(prev => [...prev, { id: Date.now().toString(), subject: '', startTime: '', endTime: '' }]);
  const removeClassSlot = (id: string) => setClassSlots(prev => prev.filter(s => s.id !== id));
  const updateClassSlot = (id: string, field: string, value: string) => setClassSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  // Activity management
  const addActivity = () => setActivities(prev => [...prev, { id: Date.now().toString(), name: '', hours: 0 }]);
  const removeActivity = (id: string) => setActivities(prev => prev.filter(a => a.id !== id));
  const updateActivity = (id: string, field: string, value: string | number) => setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  // ─── Generate Analysis (Daksh4 exact formula) ──────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const study = Number(studyHours) || 0;
    const sleep = Number(sleepHours) || 0;
    const totalPlay = activities.reduce((sum, a) => sum + (a.hours || 0), 0);
    
    // Daksh4 exact mathematical model
    const extraSleep = Math.max(0, sleep - targetSleep);
    const timeWasted = Math.max(0, 24 - (totalClassHrs + sleep + study + totalPlay));
    
    // Unproductive = Extra Sleep + Play Time + Unaccounted Wasted Time
    const totalUnproductive = extraSleep + totalPlay + timeWasted;
    const isProductive = totalUnproductive <= maxWaste;

    // Productivity Score (0-100)
    // Based on: study completion + sleep quality + waste control
    const studyScore = Math.min(1, study / targetStudy) * 40;  // 40% weight
    const sleepScore = (sleep >= targetSleep - 1 && sleep <= targetSleep + 1) ? 20 : Math.max(0, 20 - Math.abs(sleep - targetSleep) * 3);  // 20% weight
    const wasteScore = Math.max(0, 40 - (totalUnproductive / maxWaste) * 40);  // 40% weight
    const productivityScore = Math.min(100, Math.round(studyScore + sleepScore + wasteScore));

    const result: AnalysisResult = {
      classesHrs: totalClassHrs,
      studyHrs: study,
      sleepHrs: sleep,
      playHrs: totalPlay,
      wastedHrs: timeWasted,
      totalUnproductive,
      isProductive,
      maxWaste,
      productivityScore,
      extraSleep,
    };

    // Save to daily history
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[new Date().getDay()];
    
    const newRecord: DailyRecord = {
      date: dayName,
      score: productivityScore,
      classesHrs: totalClassHrs,
      studyHrs: study,
      sleepHrs: sleep,
      playHrs: totalPlay,
      wastedHrs: timeWasted,
      isProductive,
    };

    setHistory(prev => {
      // Replace if same day already exists, otherwise append (max 7 days)
      const filtered = prev.filter(r => r.date !== dayName);
      const updated = [...filtered, newRecord].slice(-7);
      saveHistory(updated);
      return updated;
    });

    setAnalysis(result);
    setShowAnalysis(true);
  };

  // Chart data from analysis
  const pieData = analysis ? [
    { name: 'Classes', value: analysis.classesHrs, fill: '#3b82f6' },
    { name: 'Study', value: analysis.studyHrs, fill: '#22c55e' },
    { name: 'Sleep', value: analysis.sleepHrs, fill: '#8b5cf6' },
    { name: 'Play', value: analysis.playHrs, fill: '#eab308' },
    { name: 'Wasted', value: analysis.wastedHrs, fill: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  // Weekly productivity data (from real history)
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => {
      const record = history.find(r => r.date === day);
      return { day, score: record?.score || 0 };
    });
  }, [history]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily <span className="gradient-text">Log</span></h1>
            <p className="text-gray-500 text-sm">Configure targets and log your daily metrics</p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Configuration */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-5 pb-2 border-b border-white/5">
            Target Configuration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" /> Target Study Hours
              </label>
              <input type="number" value={targetStudy} onChange={e => setTargetStudy(+e.target.value)} step="0.5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-lg outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <Moon className="w-3 h-3" /> Target Sleep Hours
              </label>
              <input type="number" value={targetSleep} onChange={e => setTargetSleep(+e.target.value)} step="0.5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-lg outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Max Waste Allowed (hrs)
              </label>
              <input type="number" value={maxWaste} onChange={e => setMaxWaste(+e.target.value)} step="0.5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-lg outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
        </motion.div>

        {/* Daily Actuals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-5 pb-2 border-b border-white/5">
            Daily Actuals
          </h3>

          {/* Class Slots */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 font-medium mb-3 block flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Class Time Slots
            </label>
            <div className="space-y-2">
              {classSlots.map((slot) => (
                <motion.div key={slot.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                  <input type="text" placeholder="Subject" value={slot.subject}
                    onChange={e => updateClassSlot(slot.id, 'subject', e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                  <input type="time" value={slot.startTime}
                    onChange={e => updateClassSlot(slot.id, 'startTime', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-center outline-none focus:border-primary/50 w-28 transition-colors" />
                  <span className="text-gray-600 text-sm">to</span>
                  <input type="time" value={slot.endTime}
                    onChange={e => updateClassSlot(slot.id, 'endTime', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-center outline-none focus:border-primary/50 w-28 transition-colors" />
                  {classSlots.length > 1 && (
                    <button type="button" onClick={() => removeClassSlot(slot.id)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            <button type="button" onClick={addClassSlot} className="text-primary text-xs font-bold mt-2 hover:text-white transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Class Slot
            </button>
            <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Computed Class Duration</span>
                <span className="text-sm font-bold text-primary">{totalClassHrs.toFixed(1)} hrs</span>
              </div>
            </div>
          </div>

          {/* Study & Sleep */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><BookOpen className="w-3 h-3" />Actual Study Time (hrs)</label>
              <input type="number" value={studyHours} onChange={e => setStudyHours(e.target.value ? +e.target.value : '')} step="0.5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-lg outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><Moon className="w-3 h-3" />Actual Sleep Time (hrs)</label>
              <input type="number" value={sleepHours} onChange={e => setSleepHours(e.target.value ? +e.target.value : '')} step="0.5"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-lg outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
        </motion.div>

        {/* Play Activities */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-5 pb-2 border-b border-white/5 flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5" /> Play Section (Activities)
          </h3>
          <div className="space-y-2">
            {activities.map(act => (
              <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                <input type="text" placeholder="Activity (e.g. Gaming, Social media)" value={act.name}
                  onChange={e => updateActivity(act.id, 'name', e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                <input type="number" placeholder="Hours" step="0.5" value={act.hours || ''}
                  onChange={e => updateActivity(act.id, 'hours', +e.target.value)}
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-center font-bold outline-none focus:border-primary/50 transition-colors" />
                {activities.length > 1 && (
                  <button type="button" onClick={() => removeActivity(act.id)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
          <button type="button" onClick={addActivity} className="text-primary text-xs font-bold mt-2 hover:text-white transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Activity
          </button>
        </motion.div>

        {/* Submit */}
        <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="w-full bg-primary text-background font-bold py-4 rounded-xl text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-shadow flex items-center justify-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Generate Analysis
        </motion.button>
      </form>

      {/* Analysis Dashboard */}
      <AnimatePresence>
        {showAnalysis && analysis && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Verdict Banner */}
            <div className={`glass rounded-2xl p-6 border ${analysis.isProductive ? 'border-green-500/30' : 'border-red-500/30'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Daily Verdict</h3>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold" style={{ color: analysis.productivityScore >= 60 ? '#22c55e' : '#ef4444' }}>
                    {analysis.productivityScore}% Score
                  </span>
                </div>
              </div>

              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`text-center py-5 px-8 rounded-xl text-2xl font-black tracking-[4px] uppercase ${
                  analysis.isProductive
                    ? 'text-green-400 bg-green-500/5 border border-green-500/20'
                    : 'text-red-400 bg-red-500/5 border border-red-500/20'
                }`}
                style={{ textShadow: analysis.isProductive ? '0 0 15px rgba(0,255,157,0.3)' : '0 0 15px rgba(255,0,85,0.3)' }}
              >
                {analysis.isProductive ? '✓ PRODUCTIVE DAY' : '✗ UNPRODUCTIVE DAY'}
              </motion.div>

              {/* Detailed breakdown */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Classes" value={`${analysis.classesHrs.toFixed(1)}h`} color="#3b82f6" />
                <StatCard label="Study" value={`${analysis.studyHrs.toFixed(1)}h`} color="#22c55e" />
                <StatCard label="Extra Sleep" value={`${analysis.extraSleep.toFixed(1)}h`} color="#8b5cf6" />
                <StatCard label="Wasted" value={`${analysis.wastedHrs.toFixed(1)}h`} color="#ef4444" />
              </div>

              <p className="text-sm text-gray-400 text-center mt-3">
                Total unproductive: <strong>{analysis.totalUnproductive.toFixed(1)} hrs</strong> — Max allowed: <strong>{analysis.maxWaste} hrs</strong>
              </p>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (analysis.totalUnproductive / analysis.maxWaste) * 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${analysis.isProductive ? 'bg-green-500 shadow-sm shadow-green-500/40' : 'bg-red-500 shadow-sm shadow-red-500/40'}`}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                  <span>0 hrs</span>
                  <span>{analysis.maxWaste} hrs (limit)</span>
                </div>
              </div>
            </div>

            {/* Charts side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Doughnut */}
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">24-Hour Breakdown</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius="55%" outerRadius="85%" paddingAngle={3} animationDuration={1200}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Productivity Bar */}
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Weekly Productivity Score</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip content={<BarTip />} />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} animationDuration={1200}>
                        {weeklyData.map((entry, i) => (
                          <Cell key={i} fill={entry.score >= 60 ? '#22c55e' : entry.score > 0 ? '#ef4444' : '#1a1a2e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
