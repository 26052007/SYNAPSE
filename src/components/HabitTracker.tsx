import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Target, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────
interface Habit {
  id: string;
  name: string;
  color: string;
  ticks: boolean[]; // each day of month
}

// Neon colors from Daksh4
const NEON_COLORS = ['#00f0ff', '#ff0055', '#00ff9d', '#ffaa00', '#aa00ff', '#06b6d4', '#ef4444', '#84cc16'];

const STORAGE_KEY = 'synapse_habits';

function loadHabits(): Habit[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveHabits(h: Habit[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); }

// ─── Custom tooltip ──────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10" style={{ background: 'rgba(10,10,15,0.9)' }}>
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────
export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits);
  const [newName, setNewName] = useState('');

  // Current month calendar
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const monthName = now.toLocaleString('default', { month: 'long' });

  const persist = useCallback((updated: Habit[]) => {
    setHabits(updated);
    saveHabits(updated);
  }, []);

  // Add habit
  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const color = NEON_COLORS[habits.length % NEON_COLORS.length];
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newName.trim(),
      color,
      ticks: new Array(daysInMonth).fill(false),
    };
    persist([...habits, newHabit]);
    setNewName('');
  };

  // Toggle day
  const toggleDay = (habitId: string, dayIdx: number) => {
    persist(habits.map(h => {
      if (h.id !== habitId) return h;
      const ticks = [...h.ticks];
      ticks[dayIdx] = !ticks[dayIdx];
      return { ...h, ticks };
    }));
  };

  // Delete habit
  const deleteHabit = (id: string) => {
    if (confirm('Erase this neural habit?')) {
      persist(habits.filter(h => h.id !== id));
    }
  };

  // Chart data — consistency curve (Daksh4 formula)
  const chartData = useMemo(() => {
    const labels = Array.from({ length: daysInMonth }, (_, i) => `D${i + 1}`);
    return labels.map((label, i) => {
      const point: any = { name: label };
      habits.forEach(h => {
        // Accumulate: +2 for tick, -1 penalty for miss
        let consistency = 0;
        for (let j = 0; j <= i; j++) {
          if (h.ticks[j]) consistency += 2;
          else consistency = Math.max(0, consistency - 1);
        }
        point[h.name] = consistency;
      });
      return point;
    });
  }, [habits, daysInMonth]);

  return (
    <div className="p-8 max-w-[1100px] mx-auto space-y-6">
      {/* Header with add form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Neural <span className="px-2 py-0.5 rounded-lg bg-primary/20 text-primary text-xl">HABITS</span>
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">Consistency determines the strength of the neural link.</p>
            </div>
          </div>

          <form onSubmit={addHabit} className="flex gap-2">
            <input
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="New Habit..." required
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary/50 w-48 transition-colors"
            />
            <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="bg-primary text-background px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* 31-Day Matrix Grid (Daksh4 style) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl border border-white/10 p-5 overflow-x-auto"
      >
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">
          {monthName} {year} — Matrix
        </p>

        {habits.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            Add a habit to begin tracking your neural consistency.
          </div>
        ) : (
          <div className="min-w-[700px]">
            {/* Header row: day numbers */}
            <div
              className="grid gap-[3px] mb-2"
              style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, 1fr)` }}
            >
              <div className="text-[10px] text-gray-500 font-bold uppercase">Habit</div>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <div key={i} className={`text-[9px] text-center font-bold ${i + 1 === today ? 'text-primary' : 'text-gray-600'}`}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Habit rows */}
            <div className="flex flex-col gap-2">
              {habits.map((habit, hi) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: hi * 0.05 }}
                  className="grid gap-[3px] group"
                  style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, 1fr)` }}
                >
                  {/* Habit name */}
                  <div
                    className="flex items-center justify-between text-xs font-semibold truncate pr-1 rounded-md px-1"
                    style={{ color: habit.color, textShadow: `0 0 5px ${habit.color}80` }}
                    title={habit.name}
                  >
                    <span className="truncate">{habit.name}</span>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }, (_, di) => {
                    const active = habit.ticks[di];
                    return (
                      <motion.button
                        key={di}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleDay(habit.id, di)}
                        className="w-full aspect-square rounded transition-all"
                        style={{
                          background: active ? habit.color : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${active ? habit.color : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: active ? `0 0 8px ${habit.color}` : 'none',
                          minWidth: '18px',
                          minHeight: '18px',
                          maxWidth: '22px',
                          maxHeight: '22px',
                        }}
                      />
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Consistency Graph */}
      {habits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl border border-white/10 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Consistency Graph</h3>
            <span className="text-[10px] text-gray-600 font-bold tracking-wider">LIVE CHART ENGINE</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  {habits.map(h => (
                    <linearGradient key={h.id} id={`grad-${h.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={h.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={h.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip content={<ChartTip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                {habits.map(h => (
                  <Area
                    key={h.id}
                    type="monotone"
                    dataKey={h.name}
                    stroke={h.color}
                    fill={`url(#grad-${h.id})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={1200}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      {habits.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {habits.slice(0, 4).map(h => {
            const completedCount = h.ticks.filter(Boolean).length;
            const streak = getStreak(h.ticks, today - 1);
            return (
              <motion.div key={h.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-3 border border-white/10"
              >
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 truncate">{h.name}</p>
                <p className="text-xl font-bold" style={{ color: h.color }}>{completedCount}<span className="text-xs text-gray-500">/{daysInMonth}</span></p>
                <p className="text-[10px] text-gray-600 mt-0.5">{streak}d streak</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Calculate current streak ending at dayIdx
function getStreak(ticks: boolean[], endIdx: number): number {
  let streak = 0;
  for (let i = endIdx; i >= 0; i--) {
    if (ticks[i]) streak++;
    else break;
  }
  return streak;
}
