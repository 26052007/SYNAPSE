import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Eye, Target, Code2, Users, Sparkles,
  Calendar as CalendarIcon, Kanban, Settings as SettingsIcon, ClipboardList, X,
  Brain, Globe
} from 'lucide-react';

type Page = string;

interface MegaMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
}

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

const menuItems: MegaMenuItem[] = [
  { id: 'language', label: 'GLOBAL SYNC', icon: <Globe className="w-5 h-5" />, color: '#00f2ff' },
  { id: 'tasks', label: 'TASK MATRIX', icon: <Kanban className="w-5 h-5" /> },
  { id: 'calendar', label: 'CALENDAR', icon: <CalendarIcon className="w-5 h-5" /> },
  { id: 'focus', label: 'FOCUS MODE', icon: <Eye className="w-5 h-5" /> },
  { id: 'habits', label: 'NEURAL HABITS', icon: <Target className="w-5 h-5" /> },
  { id: 'timetable', label: 'DAILY LOG', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'codeforces', label: 'CODEFORCES', icon: <Code2 className="w-5 h-5" /> },
  { id: 'vault', label: 'STUDY VAULT', icon: <Users className="w-5 h-5" />, color: '#6554c0' },
  { id: 'games', label: 'COGNITIVE TRAINING', icon: <Brain className="w-5 h-5" />, color: '#ffaa00' },
  { id: 'syllabus', label: 'AI PARSER', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'settings', label: 'SETTINGS', icon: <SettingsIcon className="w-5 h-5" /> },
];

export default function MegaMenu({ isOpen, onClose, onNavigate }: MegaMenuProps) {
  const burstContainerRef = useRef<HTMLDivElement>(null);
  const particleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<HTMLDivElement>(null);

  // Procedural particles — Daksh4 water bubbles + fire embers
  useEffect(() => {
    if (isOpen) {
      particleIntervalRef.current = setInterval(() => {
        // Water bubble
        if (waterRef.current) {
          const drop = document.createElement('div');
          drop.className = 'mega-water-drop';
          const s = Math.random() * 25 + 5;
          Object.assign(drop.style, {
            left: Math.random() * 100 + 'vw',
            top: (Math.random() * 40 + 60) + 'vh',
            width: s + 'px', height: s + 'px',
          });
          waterRef.current.appendChild(drop);
          setTimeout(() => drop.remove(), 5000);
        }
        // Fire ember
        if (fireRef.current) {
          const ember = document.createElement('div');
          ember.className = 'mega-fire-ember';
          const es = Math.random() * 60 + 20;
          Object.assign(ember.style, {
            left: Math.random() * 100 + 'vw',
            bottom: '-50px',
            width: es + 'px', height: es + 'px',
          });
          fireRef.current.appendChild(ember);
          setTimeout(() => ember.remove(), 3000);
        }
      }, 100);
    }

    return () => {
      if (particleIntervalRef.current) {
        clearInterval(particleIntervalRef.current);
        particleIntervalRef.current = null;
      }
      if (waterRef.current) waterRef.current.innerHTML = '';
      if (fireRef.current) fireRef.current.innerHTML = '';
    };
  }, [isOpen]);

  const handleItemClick = (e: React.MouseEvent, pageId: string) => {
    createBurst(e.clientX, e.clientY);
    setTimeout(() => {
      onNavigate(pageId);
      onClose();
    }, 250);
  };

  const createBurst = (x: number, y: number) => {
    const container = burstContainerRef.current;
    if (!container) return;
    const colors = ['#00f2ff', '#ff0055', '#ffaa00', '#7000ff'];
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 8 + 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      Object.assign(p.style, {
        width: size + 'px', height: size + 'px',
        background: color, position: 'fixed',
        left: x + 'px', top: y + 'px',
        borderRadius: '50%', pointerEvents: 'none',
        zIndex: '999999', boxShadow: `0 0 12px ${color}`,
      });
      container.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 80 + 30;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - 30;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: '0' }
      ], { duration: Math.random() * 500 + 300, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
      setTimeout(() => p.remove(), 1000);
    }
  };

  // Arc layout: items placed along a large arc on the left side
  const getArcPosition = (index: number, total: number) => {
    // Arc spans from -70° to 70° (top to bottom), centered vertically
    const startAngle = -65; // degrees
    const endAngle = 65;
    const angle = startAngle + (index / (total - 1)) * (endAngle - startAngle);
    const rad = (angle * Math.PI) / 180;
    
    // Large radius circle, center is off-screen to the left
    const radius = 42; // in vw units
    const centerX = -10; // vw from left edge
    const centerY = 50; // vh (center of screen)
    
    const x = centerX + radius * Math.cos(rad);
    const y = centerY + radius * Math.sin(rad);
    
    return { x, y, angle };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: [0.86, 0, 0.07, 1] }}
          className="fixed inset-0 z-[9000]"
        >
          {/* Daksh4 Fire-Ice animated gradient background */}
          <div className="absolute inset-0 mega-fire-ice-bg">
            {/* Procedural particle containers */}
            <div ref={waterRef} className="absolute inset-0 pointer-events-none overflow-hidden z-[1]" />
            <div ref={fireRef} className="absolute inset-0 pointer-events-none overflow-hidden z-[2]" />
          </div>

          {/* Content overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[3]" />

          {/* Arc line (decorative dashed curve) */}
          <svg className="absolute inset-0 w-full h-full z-[4] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <ellipse
              cx="-10" cy="50" rx="42" ry="42"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.15"
              strokeDasharray="0.8 0.6"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ delay: 0.2 }}
            onClick={onClose}
            className="absolute top-8 right-8 z-50 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </motion.button>

          {/* Title - right side */}
          <motion.h2
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="absolute top-[15%] right-[10%] z-10 text-lg font-bold text-white/30 uppercase tracking-[8px]"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            SELECT DIRECTIVE
          </motion.h2>

          {/* Menu items on arc */}
          <div className="absolute inset-0 z-10">
            {menuItems.map((item, i) => {
              const pos = getArcPosition(i, menuItems.length);
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -60, filter: 'blur(15px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: 0.1 + i * 0.06,
                    duration: 0.7,
                    ease: [0.2, 0.8, 0.2, 1]
                  }}
                  whileHover={{ scale: 1.12, x: 15 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => handleItemClick(e, item.id)}
                  className="absolute flex items-center gap-3 cursor-pointer group"
                  style={{
                    left: `${pos.x}vw`,
                    top: `${pos.y}vh`,
                    transform: 'translate(0, -50%)',
                  }}
                >
                  {/* Dot on the arc */}
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(0,242,255,0.6)] group-hover:bg-white group-hover:shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all shrink-0" />
                  
                  {/* Label */}
                  <span
                    className="text-white/50 group-hover:text-white text-sm sm:text-base font-bold tracking-[3px] uppercase transition-all whitespace-nowrap"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      color: item.color || undefined,
                      textShadow: item.color ? `0 0 15px ${item.color}40` : undefined,
                    }}
                  >
                    {item.label}
                  </span>
                  
                  {/* Icon (appears on hover) */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary ml-1">
                    {item.icon}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Burst particles container */}
          <div ref={burstContainerRef} className="fixed inset-0 pointer-events-none z-[99999]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
