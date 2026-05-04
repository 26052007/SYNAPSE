import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Monitor, Shield, Bell, BellOff, User, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const NOTIF_KEY = 'synapse-notif-settings';
const TASKS_KEY = 'synapse-tasks-store';

function loadNotifSettings() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}'); } catch { return {}; }
}

export default function Settings({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const [emailNotif, setEmailNotif] = useState(() => loadNotifSettings().email ?? true);
  const [pushNotif, setPushNotif] = useState(() => loadNotifSettings().push ?? false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [notifFeedback, setNotifFeedback] = useState('');

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ email: emailNotif, push: pushNotif }));
  }, [emailNotif, pushNotif]);

  // Request notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setNotifFeedback('Browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        setPushNotif(true);
        setNotifFeedback('Notifications enabled!');
        // Send test notification
        new Notification('Synapse Neural Core', {
          body: 'Push notifications are now active. You\'ll receive deadline reminders.',
          icon: '/favicon.ico',
        });
      } else {
        setPushNotif(false);
        setNotifFeedback('Permission denied. Enable in browser settings.');
      }
    } catch (err) {
      setNotifFeedback('Error requesting permission');
    }
    setTimeout(() => setNotifFeedback(''), 3000);
  };

  // Toggle push notifications
  const handlePushToggle = () => {
    if (!pushNotif) {
      if (permissionStatus === 'granted') {
        setPushNotif(true);
        startDeadlineChecker();
      } else {
        requestPermission();
      }
    } else {
      setPushNotif(false);
    }
  };

  // Deadline notification checker - runs every 60s
  const startDeadlineChecker = useCallback(() => {
    const check = () => {
      if (Notification.permission !== 'granted') return;
      
      try {
        const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
        const now = new Date();
        const notifiedKey = 'synapse-notified-tasks';
        const notified = new Set(JSON.parse(localStorage.getItem(notifiedKey) || '[]'));

        tasks.forEach((task: any) => {
          if (task.status === 'done' || !task.deadline) return;
          
          const due = new Date(task.deadline + 'T23:59:59');
          const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
          const notifId = `${task.id}-${Math.floor(hoursLeft / 6)}`; // Notify every 6 hour window

          if (hoursLeft <= 24 && hoursLeft > 0 && !notified.has(notifId)) {
            new Notification('⚡ Synapse Deadline Alert', {
              body: `"${task.title}" is due in ${Math.round(hoursLeft)} hours!`,
              icon: '/favicon.ico',
              tag: task.id,
            });
            notified.add(notifId);
          }

          if (hoursLeft <= 0 && !notified.has(`${task.id}-overdue`)) {
            new Notification('🔴 Synapse: Task Overdue!', {
              body: `"${task.title}" has passed its deadline!`,
              icon: '/favicon.ico',
              tag: task.id + '-overdue',
            });
            notified.add(`${task.id}-overdue`);
          }
        });

        localStorage.setItem(notifiedKey, JSON.stringify([...notified]));
      } catch (err) {
        console.error('Notification check error:', err);
      }
    };

    check(); // Run immediately
    const interval = setInterval(check, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Start checker if push is enabled
  useEffect(() => {
    if (pushNotif && permissionStatus === 'granted') {
      const cleanup = startDeadlineChecker();
      return cleanup;
    }
  }, [pushNotif, permissionStatus, startDeadlineChecker]);

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm">Manage your account and app preferences.</p>
      </motion.div>

      <div className="grid gap-6">
        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass p-6 rounded-2xl border border-white/10 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Appearance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ThemeOption 
              active={theme === 'dark'} 
              onClick={() => setTheme('dark')}
              icon={<Moon className="w-6 h-6" />}
              label="Dark Mode"
              description="Neural dark theme"
              color="#0f172a"
            />
            <ThemeOption 
              active={theme === 'light'} 
              onClick={() => setTheme('light')}
              icon={<Sun className="w-6 h-6" />}
              label="Light Mode"
              description="Clean, bright interface"
              color="#f4f7fb"
            />
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass p-6 rounded-2xl border border-white/10 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Notifications
          </h3>
          
          {notifFeedback && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
              <Check className="w-4 h-4" />
              {notifFeedback}
            </motion.div>
          )}

          <div className="space-y-3">
            <ToggleItem 
              label="Email Notifications" 
              description="Receive weekly summaries and project updates via email."
              checked={emailNotif}
              onChange={setEmailNotif}
            />
            <ToggleItem 
              label="Browser Push Notifications" 
              description={
                permissionStatus === 'granted' 
                  ? "Active — You'll get deadline reminders for tasks due within 24 hours." 
                  : permissionStatus === 'denied'
                  ? "Blocked — Enable in browser settings (Site Settings → Notifications)."
                  : "Click to enable real-time deadline reminders."
              }
              checked={pushNotif}
              onChange={handlePushToggle}
              badge={
                permissionStatus === 'granted' ? <span className="text-[9px] text-green-400 font-bold px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">ACTIVE</span> :
                permissionStatus === 'denied' ? <span className="text-[9px] text-red-400 font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">BLOCKED</span> :
                null
              }
            />
          </div>
        </motion.div>

        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass p-6 rounded-2xl border border-white/10 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-secondary" />
            Account Security
          </h3>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
            </div>
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all">
              Enable
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ThemeOption({ active, onClick, icon, label, description, color }: any) {
  return (
    <motion.button 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-4 p-5 rounded-xl border transition-all text-left",
        active 
          ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5" 
          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center border",
        active ? "border-primary/30 text-primary" : "border-white/10"
      )} style={{ background: active ? undefined : `${color}20` }}>
        {icon}
      </div>
      <div>
        <p className={cn("font-bold text-sm", active ? "text-primary" : "")}>{label}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      {active && (
        <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-background" />
        </div>
      )}
    </motion.button>
  );
}

function ToggleItem({ label, description, checked, onChange, badge }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex-1 mr-4">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm">{label}</p>
          {badge}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative shrink-0",
          checked ? "bg-primary" : "bg-white/10"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
          checked ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  );
}
