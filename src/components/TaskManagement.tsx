import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, List, Plus, Search, Filter, 
  Calendar, Tag, Sparkles, Brain, CheckCircle2, Clock, Trash2, X
} from 'lucide-react';
import { cn } from '../lib/utils';

type Task = {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'backlog';
  priority: 'low' | 'medium' | 'high';
  originalPriority: string;
  type: 'Reading' | 'Coding' | 'Writing' | 'Research';
  deadline: string;
  aiSuggested?: boolean;
};

// Shared localStorage key — CalendarView also reads this
const TASKS_KEY = 'synapse-tasks-store';

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); } catch { return []; }
}
function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function TaskTree({ tasks }: { tasks: Task[] }) {
  // Keep done tasks briefly so they can animate falling out
  const tasksByDate = tasks.reduce((acc: Record<string, Task[]>, task) => {
    const date = task.deadline || 'No Date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});
  const dates = Object.keys(tasksByDate).sort();
  const activeCount = tasks.filter(t => t.status !== 'done').length;

  return (
    <div className="relative w-full h-full flex items-end justify-center min-h-[280px] pb-12">
      <div className="absolute bottom-10 w-32 h-2 bg-primary/10 blur-xl rounded-full" />
      
      {/* Trunk */}
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: Math.min(160, 60 + activeCount * 12) }}
        className="w-4 bg-gradient-to-t from-[#3d2b1f] via-[#5d4037] to-[#8d6e63] rounded-t-full relative z-10 shadow-lg"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
          {dates.length === 0 ? (
            <>
              <div className="absolute top-4 left-full w-8 h-1 bg-[#5d4037] rounded-full rotate-[-30deg] origin-left opacity-40" />
              <div className="absolute top-8 right-full w-6 h-1 bg-[#5d4037] rounded-full rotate-[30deg] origin-right opacity-40" />
            </>
          ) : (
            dates.map((date, index) => {
              const angle = dates.length === 1 ? 0 : (index / (dates.length - 1)) * 140 - 70;
              const length = 80 + (index % 3) * 25;
              const branchColors = ['#5d4037', '#6d4c41', '#795548'];

              return (
                <motion.div
                  key={date}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: angle }}
                  transition={{ delay: index * 0.15, type: 'spring', stiffness: 120 }}
                  className="absolute top-0 left-1/2 origin-bottom w-1.5 rounded-full shadow-sm"
                  style={{ height: length, backgroundColor: branchColors[index % 3] }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full">
                    {tasksByDate[date].map((task, taskIdx) => (
                      <Leaf key={task.id} task={task} index={taskIdx} />
                    ))}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Leaf({ task, index }: { task: Task; index: number }) {
  const colors: Record<string, string> = {
    Reading: '#4ade80', Coding: '#60a5fa', Writing: '#f472b6', Research: '#fbbf24'
  };
  const leafColor = colors[task.type] || '#00f2ff';
  
  const isDone = task.status === 'done';
  const targetX = (index % 2 === 0 ? 1 : -1) * (20 + index * 12);
  const targetY = -index * 18;
  const targetRotate = (index % 2 === 0 ? 25 : -25);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isDone ? 0.5 : 1, 
        opacity: isDone ? 0 : 1,
        x: isDone ? targetX + ((index % 2 === 0 ? 1 : -1) * 30) : targetX,
        y: isDone ? 150 : targetY, // Falls downwards
        rotate: isDone ? targetRotate + ((index % 2 === 0 ? 180 : -180)) : targetRotate // Spins as it falls
      }}
      transition={
        isDone 
          ? { duration: 1.5, ease: 'easeIn', opacity: { duration: 1, delay: 0.5 } } 
          : { delay: index * 0.1, type: 'spring', stiffness: 100 }
      }
      className="absolute cursor-help group"
      style={{ pointerEvents: isDone ? 'none' : 'auto' }}
    >
      <div 
        className="w-5 h-7 rounded-full border border-white/20 backdrop-blur-md relative shadow-lg transition-transform hover:scale-125"
        style={{ backgroundColor: `${leafColor}66` }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-muted border border-white/10 rounded text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
          {task.title}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function TaskManagement() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDeadline, setNewDeadline] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'Reading' | 'Coding' | 'Writing' | 'Research'>('Reading');

  // Save to localStorage when tasks change
  useEffect(() => { saveTasks(tasks); }, [tasks]);

  // Auto-escalation: check every 30s
  useEffect(() => {
    const checkEscalation = () => {
      const now = new Date();
      setTasks(prev => prev.map(task => {
        if (task.status === 'done') return task;
        
        if (task.deadline) {
          const dueDate = new Date(task.deadline + 'T23:59:59');
          const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          // Overdue → backlog
          if (hoursLeft <= 0 && task.status !== 'backlog') {
            return { ...task, status: 'backlog' as const, priority: 'high' as const };
          }
          // < 24 hours → auto-escalate to high
          if (hoursLeft > 0 && hoursLeft <= 24 && task.priority !== 'high') {
            return { ...task, priority: 'high' as const };
          }
        }
        return task;
      }));
    };
    checkEscalation();
    const interval = setInterval(checkEscalation, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      status: 'todo',
      priority: newPriority,
      originalPriority: newPriority,
      type: newType,
      deadline: newDeadline || new Date().toISOString().split('T')[0],
      aiSuggested: Math.random() > 0.7,
    };

    setTasks(prev => [newTask, ...prev]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewPriority('medium');
    setNewDeadline('');
    setNewDescription('');
    setNewType('Reading');
  };

  const updateTaskStatus = (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All Types' || task.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const columns = [
    { id: 'todo', title: 'To Do', icon: <Clock className="w-4 h-4" /> },
    { id: 'in-progress', title: 'In Progress', icon: <Brain className="w-4 h-4" /> },
    { id: 'done', title: 'Done', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-gray-400 text-sm">Manage your academic workload with AI-driven prioritization.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass p-1 rounded-xl flex items-center">
            <button 
              onClick={() => setView('kanban')}
              className={cn("p-2 rounded-lg transition-all", view === 'kanban' ? "bg-primary text-background shadow-lg" : "text-gray-400 hover:text-white")}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-primary text-background shadow-lg" : "text-gray-400 hover:text-white")}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-xl font-bold"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </motion.button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" placeholder="Search tasks..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter className="w-4 h-4" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-white font-medium outline-none cursor-pointer">
              <option>All Types</option>
              <option>Coding</option>
              <option>Reading</option>
              <option>Writing</option>
              <option>Research</option>
            </select>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-sm text-primary font-bold">
            <Sparkles className="w-4 h-4" />
            {tasks.length} tasks
          </div>
        </div>
      </div>

      {/* Task Tree */}
      <div className="glass rounded-2xl p-8 border border-white/10 overflow-hidden relative min-h-[280px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <TaskTree tasks={tasks} />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
          <Brain className="w-3 h-3" />
          Neural Growth Visualization
        </div>
      </div>

      {/* Kanban or List */}
      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => 
              col.id === 'todo' ? (t.status === 'todo' || t.status === 'backlog') :
              t.status === col.id
            );
            return (
              <div key={col.id} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-xs tracking-widest">
                    {col.icon} {col.title}
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px]">{colTasks.length}</span>
                  </div>
                </div>
                <div className="space-y-4 min-h-[300px] p-2 rounded-2xl bg-white/[0.02] border border-dashed border-white/5">
                  <AnimatePresence>
                    {colTasks.map((task) => (
                      <TaskCard 
                        key={task.id} task={task} 
                        onStatusChange={(s) => updateTaskStatus(task.id, s)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Task</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Priority</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Type</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500">Deadline</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const isOverdue = task.status === 'backlog';
                return (
                  <tr key={task.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {task.aiSuggested && <Sparkles className="w-4 h-4 text-primary shrink-0" />}
                        <span className="font-bold">{task.title}</span>
                        {isOverdue && <span className="text-red-400 text-[10px] font-bold animate-pulse">OVERDUE</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase border bg-transparent outline-none",
                          task.status === 'done' ? "border-green-500/20 text-green-400" :
                          task.status === 'backlog' ? "border-red-500/20 text-red-400" :
                          task.status === 'in-progress' ? "border-primary/20 text-primary" :
                          "border-gray-500/20 text-gray-400"
                        )}>
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full",
                          task.priority === 'high' ? "bg-red-500" : task.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                        )} />
                        <span className="text-sm capitalize">{task.priority}</span>
                      </div>
                    </td>
                    <td className="p-4"><div className="flex items-center gap-2 text-sm text-gray-400"><Tag className="w-3 h-3" />{task.type}</div></td>
                    <td className="p-4 text-sm text-gray-400">{task.deadline}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: 'rgba(10,10,15,0.95)' }}
            >
              <form onSubmit={handleCreateTask} className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">New Task</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <input required type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task title..." autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-primary/50 text-sm" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Priority</label>
                      <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none text-sm">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Deadline</label>
                      <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none text-sm" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Reading', 'Coding', 'Writing', 'Research'] as const).map(type => (
                        <button key={type} type="button" onClick={() => setNewType(type)}
                          className={cn("py-2 rounded-lg text-xs font-bold uppercase border transition-all",
                            newType === type ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                          )}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea rows={2} value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description (optional)..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-primary/50 resize-none text-sm" />
                </div>

                <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full bg-primary text-background font-bold py-3 rounded-xl text-sm">
                  Create Task
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, onStatusChange, onDelete }: { task: Task; onStatusChange: (s: string) => void; onDelete: () => void }) {
  const isOverdue = task.status === 'backlog';
  const dueDate = task.deadline ? new Date(task.deadline + 'T23:59:59') : null;
  const hoursLeft = dueDate ? (dueDate.getTime() - Date.now()) / (1000 * 60 * 60) : 999;
  const isUrgent = hoursLeft > 0 && hoursLeft <= 24;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={cn(
        "glass p-4 rounded-2xl border hover:border-white/20 transition-all group",
        isOverdue ? "border-red-500/20" : isUrgent ? "border-yellow-500/20" : "border-white/5"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
            task.priority === 'high' ? "bg-red-500/20 text-red-400" :
            task.priority === 'medium' ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
          )}>
            {task.priority}
          </span>
          <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-gray-400">{task.type}</span>
          {isOverdue && <span className="bg-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-red-400 animate-pulse">OVERDUE</span>}
          {isUrgent && !isOverdue && <span className="bg-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-400 animate-pulse">⚠ &lt;24H</span>}
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <h4 className="font-bold mb-1 flex items-center gap-2">
        {task.aiSuggested && <Sparkles className="w-3 h-3 text-primary" />}
        {task.title}
      </h4>
      {task.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>}
      
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
          <Calendar className="w-3 h-3" />
          {task.deadline || 'No date'}
        </div>
        <select value={task.status === 'backlog' ? 'todo' : task.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-transparent text-[10px] font-bold uppercase text-primary outline-none cursor-pointer">
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">✓ Done</option>
        </select>
      </div>
    </motion.div>
  );
}
