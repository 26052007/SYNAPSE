import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  Zap, Clock, Target, TrendingUp, 
  Brain, Flame, Calendar as CalendarIcon,
  ChevronRight, Sparkles
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';

const focusHeatmap = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  intensity: Math.floor(Math.random() * 100),
}));

export default function Dashboard() {
  const [energyLevel, setEnergyLevel] = useState(75);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tasks'),
      where('uid', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done');

  // Generate progress data based on real tasks (mocked for days but using real count)
  const progressData = [
    { name: 'Mon', completed: 4, goal: 5 },
    { name: 'Tue', completed: 7, goal: 5 },
    { name: 'Wed', completed: 3, goal: 5 },
    { name: 'Thu', completed: 8, goal: 5 },
    { name: 'Fri', completed: 5, goal: 5 },
    { name: 'Sat', completed: 2, goal: 5 },
    { name: 'Sun', completed: completedTasks, goal: 5 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {auth.currentUser?.displayName?.split(' ')[0] || 'Student'}</h1>
          <p className="text-gray-400">You have {pendingTasks} pending tasks. Let's get focused!</p>
        </div>
        
        <div className="glass p-4 rounded-2xl flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
              <Brain className="w-4 h-4 text-primary" />
              Cognitive Energy
            </div>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={energyLevel}
                onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                className="w-32 accent-primary"
              />
              <span className={cn(
                "text-lg font-bold",
                energyLevel > 70 ? "text-primary" : energyLevel > 30 ? "text-yellow-400" : "text-red-400"
              )}>
                {energyLevel}%
              </span>
            </div>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Suggested Task</span>
            <span className="font-medium text-primary flex items-center gap-1">
              {energyLevel > 60 ? (highPriorityTasks[0]?.title || "Deep Work") : "Light: Review Slides"}
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Target className="text-primary" />}
          label="Tasks Completed"
          value={completedTasks.toString()}
          trend="+12% from last week"
        />
        <StatCard 
          icon={<Clock className="text-secondary" />}
          label="Focus Hours"
          value="32.5h"
          trend="+4.2h this week"
        />
        <StatCard 
          icon={<Flame className="text-accent" />}
          label="Current Streak"
          value="5 Days"
          trend="Personal best: 12"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Chart */}
        <div className="glass p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Progress
            </h3>
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ color: '#00f2ff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#00f2ff" 
                  strokeWidth={3} 
                  dot={{ fill: '#00f2ff', r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="goal" 
                  stroke="#ffffff20" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Heatmap */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-accent" />
            Focus Pattern Insights
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-1 h-40">
              {focusHeatmap.map((d) => (
                <div key={d.hour} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div 
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{ 
                      height: `${d.intensity}%`,
                      backgroundColor: `rgba(255, 0, 200, ${0.2 + (d.intensity / 100) * 0.8})`
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.intensity}% at {d.hour}:00
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 px-1">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
            <p className="text-sm text-gray-400 mt-4 bg-accent/5 p-4 rounded-xl border border-accent/10">
              <Sparkles className="w-4 h-4 inline mr-2 text-accent" />
              Your peak focus is between <span className="text-white font-medium">9 PM and 11 PM</span>. We've scheduled your hardest tasks accordingly.
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
          <CalendarIcon className="w-5 h-5 text-secondary" />
          Critical Deadlines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DeadlineItem 
            title="OS Kernel Lab"
            course="CS301"
            timeLeft="2 days left"
            priority="High"
            color="red"
          />
          <DeadlineItem 
            title="Database Design"
            course="CS304"
            timeLeft="4 days left"
            priority="Medium"
            color="yellow"
          />
          <DeadlineItem 
            title="Ethics Essay"
            course="HU102"
            timeLeft="1 week left"
            priority="Low"
            color="blue"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs text-primary font-medium">{trend}</div>
    </div>
  );
}

function DeadlineItem({ title, course, timeLeft, priority, color }: any) {
  const colors: any = {
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{course}</span>
        <span className="font-bold text-lg">{title}</span>
        <span className="text-sm text-gray-400">{timeLeft}</span>
      </div>
      <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border", colors[color])}>
        {priority}
      </div>
    </div>
  );
}
