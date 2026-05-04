import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, RefreshCw, Trophy, Code2, 
  TrendingUp, Calendar, Loader2, X, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Types
interface CFUserData {
  totalSolved: number;
  dayMap: Record<number, number>;
  dailyCount: number;
  weeklyCount: number;
}

// Custom chart tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs border border-white/10">
        <p className="font-bold text-white">{label}</p>
        <p className="text-primary">{payload[0].value} problems solved</p>
      </div>
    );
  }
  return null;
}

// Heatmap cell component
function HeatmapCell({ count, dayIndex }: { count: number; dayIndex: number }) {
  const intensity = count > 0 ? Math.min(4, Math.ceil(count / 2)) : 0;
  const colorMap: Record<number, string> = {
    0: 'bg-white/[0.03]',
    1: 'bg-primary/20',
    2: 'bg-primary/40',
    3: 'bg-primary/70',
    4: 'bg-primary',
  };
  const glowMap: Record<number, string> = {
    0: '',
    1: '',
    2: '',
    3: '',
    4: 'shadow-sm shadow-primary/40',
  };

  return (
    <div
      className={`w-[11px] h-[11px] rounded-[2px] transition-all duration-200 hover:scale-150 hover:z-10 cursor-pointer ${colorMap[intensity]} ${glowMap[intensity]}`}
      title={count > 0 ? `${count} submissions (day ${dayIndex})` : `No submissions (day ${dayIndex})`}
    />
  );
}

export default function Codeforces() {
  const [cfDataMap, setCfDataMap] = useState<Record<string, CFUserData>>({});
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Codeforces user data
  const fetchHandleData = useCallback(async (handle: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=5000`);
      const data = await res.json();

      if (data.status === 'OK') {
        const solved = data.result.filter((sub: any) => sub.verdict === 'OK');
        const dayMap: Record<number, number> = {};
        const nowMs = Date.now();
        let dailyCount = 0;
        let weeklyCount = 0;

        solved.forEach((sub: any) => {
          const diffDays = Math.floor((nowMs - (sub.creationTimeSeconds * 1000)) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) dailyCount++;
          if (diffDays < 7) weeklyCount++;
          if (diffDays < 365 && diffDays >= 0) {
            dayMap[364 - diffDays] = (dayMap[364 - diffDays] || 0) + 1;
          }
        });

        setCfDataMap(prev => ({
          ...prev,
          [handle]: { totalSolved: solved.length, dayMap, dailyCount, weeklyCount }
        }));
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  }, []);

  // Add friend handler
  const handleAddFriend = async () => {
    const handle = inputValue.trim();
    if (!handle || cfDataMap[handle]) return;

    setIsAdding(true);
    setError(null);

    const success = await fetchHandleData(handle);
    if (success) {
      setInputValue('');
      setActiveHandle(handle);
    } else {
      setError(`Could not find user "${handle}" on Codeforces`);
    }
    setIsAdding(false);
  };

  // Sync all handles
  const handleSync = async () => {
    const handles = Object.keys(cfDataMap);
    if (handles.length === 0) return;

    setIsSyncing(true);
    for (const h of handles) {
      await fetchHandleData(h);
    }
    setIsSyncing(false);
  };

  // Remove a friend
  const handleRemove = (handle: string) => {
    setCfDataMap(prev => {
      const next = { ...prev };
      delete next[handle];
      return next;
    });
    if (activeHandle === handle) {
      const remaining = Object.keys(cfDataMap).filter(h => h !== handle);
      setActiveHandle(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return Object.entries(cfDataMap).map(([handle, data], i) => ({
      name: handle,
      solved: data.totalSolved,
      fill: i === 0 ? '#00f2ff' : i === 1 ? '#ff0055' : i === 2 ? '#7000ff' : '#ffb800',
    }));
  }, [cfDataMap]);

  // Leaderboard calculations
  const leaderboard = useMemo(() => {
    let bestDailyUser = 'Pending...';
    let bestWeeklyUser = 'Pending...';
    let maxDaily = -1;
    let maxWeekly = -1;

    for (const [user, stats] of Object.entries(cfDataMap)) {
      if (stats.dailyCount > maxDaily) {
        maxDaily = stats.dailyCount;
        bestDailyUser = user;
      }
      if (stats.weeklyCount > maxWeekly) {
        maxWeekly = stats.weeklyCount;
        bestWeeklyUser = user;
      }
    }

    return {
      daily: maxDaily > 0 ? `${bestDailyUser} (${maxDaily})` : (Object.keys(cfDataMap).length > 0 ? 'No solves today' : 'Pending...'),
      weekly: maxWeekly > 0 ? `${bestWeeklyUser} (${maxWeekly})` : (Object.keys(cfDataMap).length > 0 ? 'No solves this week' : 'Pending...'),
    };
  }, [cfDataMap]);

  // Active user's data
  const activeData = activeHandle ? cfDataMap[activeHandle] : null;

  // Heatmap data (365 cells)
  const heatmapCells = useMemo(() => {
    return Array.from({ length: 365 }, (_, i) => ({
      index: i,
      count: activeData?.dayMap[i] || 0,
    }));
  }, [activeData]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Code2 className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Codeforces <span className="gradient-text">Rivals</span>
            </h1>
            <p className="text-gray-500 text-sm">Compare stats • Track submissions • Compete with friends</p>
          </div>
        </div>
      </motion.div>

      {/* Add Friend Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-2xl p-5 border border-white/10"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-400 text-sm">
            <Search className="w-4 h-4 shrink-0" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
              placeholder="Enter Codeforces handle (e.g. tourist)"
              className="bg-transparent outline-none w-full text-white placeholder-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddFriend}
              disabled={isAdding || !inputValue.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-lg hover:shadow-primary/20 text-sm"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isAdding ? 'Fetching...' : 'Add Friend'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSync}
              disabled={isSyncing || Object.keys(cfDataMap).length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500/80 text-background font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-lg hover:shadow-yellow-500/20 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync All'}
            </motion.button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-red-400 text-xs mt-3 font-medium"
            >
              ⚠️ {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Friend Badges */}
        {Object.keys(cfDataMap).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(cfDataMap).map(([handle, data]) => (
              <motion.button
                key={handle}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setActiveHandle(handle)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeHandle === handle
                    ? 'bg-primary/20 text-primary border border-primary/40 shadow-md shadow-primary/10'
                    : 'bg-white/5 text-gray-300 border border-white/10 hover:border-white/20'
                }`}
              >
                <span>{handle}</span>
                <span className="text-[10px] opacity-60">({data.totalSolved})</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(handle); }}
                  className="ml-1 p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart — 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 glass rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Questions Solved (Live)</h3>
            {activeData && (
              <span className="text-2xl font-bold text-primary">{activeData.totalSolved}</span>
            )}
          </div>

          {chartData.length > 0 ? (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 11 }} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="solved" radius={[6, 6, 0, 0]} onClick={(data) => setActiveHandle(data.name)}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill} 
                        cursor="pointer"
                        opacity={activeHandle === entry.name ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center">
              <div className="text-center">
                <Code2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Add Codeforces handles to see comparison</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Leaders Panel — 1 column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Daily / Weekly Leaders */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Leaderboard</h3>
            </div>

            <div className="space-y-4">
              {/* Daily */}
              <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Daily Winner</p>
                <p className="text-sm font-bold text-yellow-400">{leaderboard.daily}</p>
              </div>
              {/* Weekly */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Weekly Winner</p>
                <p className="text-sm font-bold text-primary">{leaderboard.weekly}</p>
              </div>
            </div>
          </div>

          {/* Active User Stats */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Viewing Stats</h3>
            {activeHandle && activeData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
                  <span className="text-sm font-bold text-green-400 uppercase tracking-wider">{activeHandle}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Last 24h</p>
                    <p className="text-xl font-bold text-white">{activeData.dailyCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Last 7d</p>
                    <p className="text-xl font-bold text-white">{activeData.weeklyCount}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">All Time</p>
                  <p className="text-2xl font-bold text-primary">{activeData.totalSolved}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-xs">Select a user to view their stats</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* 365-Day Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              365-Day Submission Heatmap
              {activeHandle && <span className="text-primary ml-2">— {activeHandle}</span>}
            </h3>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-white/[0.03]" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/20" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/40" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/70" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-primary" />
            <span>More</span>
          </div>
        </div>

        {activeData ? (
          <div className="flex flex-wrap gap-[3px]">
            {heatmapCells.map((cell) => (
              <HeatmapCell key={cell.index} count={cell.count} dayIndex={cell.index} />
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Add a Codeforces handle and click on it to see the heatmap</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
