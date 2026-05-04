import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, FileText, CheckCircle2, Loader2, 
  Sparkles, Calendar, ListChecks, ArrowRight,
  AlertCircle, Brain
} from 'lucide-react';
import { cn } from '../lib/utils';

type ParsedTask = {
  title: string;
  date: string;
  type: string;
  weight: string;
};

export default function SyllabusParser() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTask[] | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const TASKS_KEY = 'synapse-tasks-store';
  const EVENTS_KEY = 'synapse-calendar-events';

  function readStore<T>(key: string, fallback: T): T {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
    } catch {
      return fallback;
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    setParsedData(null);
    setSyncComplete(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  } as any);

  const handleParse = () => {
    setIsParsing(true);
    // Simulate AI parsing
    setTimeout(() => {
      setParsedData([
        { title: 'Assignment 1: Data Structures', date: '2026-04-20', type: 'Assignment', weight: '10%' },
        { title: 'Midterm Examination', date: '2026-05-15', type: 'Exam', weight: '30%' },
        { title: 'Project Proposal', date: '2026-04-25', type: 'Project', weight: '5%' },
        { title: 'Final Project Submission', date: '2026-06-10', type: 'Project', weight: '40%' },
        { title: 'Weekly Quiz 1', date: '2026-04-14', type: 'Quiz', weight: '2.5%' },
      ]);
      setIsParsing(false);
    }, 3000);
  };

  const handleSync = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setIsSyncing(true);

    try {
      const existingTasks = readStore<any[]>(TASKS_KEY, []);
      const existingEvents = readStore<any[]>(EVENTS_KEY, []);

      const nextTasks = [...existingTasks];
      const nextEvents = [...existingEvents];

      for (const item of parsedData) {
        const alreadyTask = nextTasks.some((t) => t.title === item.title && t.deadline === item.date);
        if (!alreadyTask) {
          nextTasks.unshift({
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: item.title,
            description: `Extracted from syllabus. Weight: ${item.weight}`,
            status: 'todo',
            priority: item.weight.includes('30%') || item.weight.includes('40%') ? 'high' : 'medium',
            originalPriority: item.weight.includes('30%') || item.weight.includes('40%') ? 'high' : 'medium',
            type: item.type === 'Assignment' ? 'Writing' : item.type === 'Project' ? 'Coding' : 'Research',
            deadline: item.date,
            aiSuggested: true,
          });
        }

        const alreadyEvent = nextEvents.some((e) => e.title === item.title && e.date === item.date);
        if (!alreadyEvent) {
          nextEvents.push({
            id: `syll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: item.title,
            date: item.date,
            type: 'event',
            color: '#00f2ff',
          });
        }
      }

      localStorage.setItem(TASKS_KEY, JSON.stringify(nextTasks));
      localStorage.setItem(EVENTS_KEY, JSON.stringify(nextEvents));
      setSyncComplete(true);
      setParsedData(null);
      setFile(null);
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>The "Zero-Friction" Setup</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">AI Syllabus Parser</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Upload your course syllabus (PDF or Image) and watch Synapse extract all assignments, exams, and deadlines automatically.
        </p>
      </header>

      {syncComplete && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h4 className="font-bold text-green-400">Sync Successful!</h4>
              <p className="text-sm text-gray-400">All tasks have been added to your Kanban board.</p>
            </div>
          </div>
          <button 
            onClick={() => setSyncComplete(false)}
            className="text-sm font-bold text-green-400 hover:underline"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={cn(
              "glass border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
              isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-white/10 hover:border-white/20",
              file && "border-primary/50 bg-primary/5"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              {file ? <FileText className="w-8 h-8 text-primary" /> : <FileUp className="w-8 h-8 text-gray-400" />}
            </div>
            {file ? (
              <div className="space-y-2">
                <p className="font-bold text-white">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setParsedData(null); }}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-white">Drop your syllabus here</p>
                <p className="text-sm text-gray-500">Supports PDF, PNG, JPG</p>
              </div>
            )}
          </div>

          <button
            disabled={!file || isParsing}
            onClick={handleParse}
            className={cn(
              "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
              file && !isParsing ? "bg-primary text-background hover:scale-[1.02]" : "bg-white/5 text-gray-500 cursor-not-allowed"
            )}
          >
            {isParsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI is analyzing your syllabus...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Syllabus
              </>
            )}
          </button>

          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-secondary" />
              How it works
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                Our AI scans the document for keywords like "Assignment", "Due", and "Exam".
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                Dates are extracted and normalized to your local timezone.
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                Tasks are automatically created in your Kanban board with priority weights.
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl overflow-hidden min-h-[400px] flex flex-col">
            <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                Extraction Results
              </h3>
              {parsedData && (
                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {parsedData.length} Tasks Found
                </span>
              )}
            </div>
            
            <div className="flex-1 p-6">
              <AnimatePresence mode="wait">
                {isParsing ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-gray-400 animate-pulse">Identifying deadlines and grading weights...</p>
                  </motion.div>
                ) : parsedData ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {parsedData.map((task, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.type} • {task.weight} weight</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary">{task.date}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-30">
                    <FileText className="w-16 h-16" />
                    <p>Results will appear here after parsing</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {parsedData && (
              <div className="p-6 bg-primary/10 border-t border-primary/20">
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full bg-primary text-background font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Sync to My Calendar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
