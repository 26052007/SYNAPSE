import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Calculator, Type, HelpCircle, Zap, Trophy, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Data ────────────────────────────────────────────────────────
const DECRYPTOR_DICT = [
  "TASK","WORK","CODE","DATA","PLAN","FOCUS","LOGIC","BRAIN","SMART","THINK",
  "SYSTEM","METHOD","MATRIX","NEURAL","CYBER","NETWORK","SYNAPSE","ALGORITHM","COGNITIVE","HEURISTIC"
];

const TRIVIA_DB = [
  { q: "What is the primary language used to style web pages?", opts: ["HTML","Python","CSS","C++"], correct: 2 },
  { q: "What does CPU stand for?", opts: ["Computer Personal Unit","Central Process Unit","Central Processing Unit","Control Processor Unit"], correct: 2 },
  { q: "In physics, what is the standard unit of force?", opts: ["Joule","Watt","Newton","Pascal"], correct: 2 },
  { q: "Which data structure operates on LIFO basis?", opts: ["Queue","Stack","Tree","Graph"], correct: 1 },
  { q: "What is the approximate speed of light in vacuum?", opts: ["300,000 km/s","150,000 km/s","1,000,000 km/s","30,000 km/s"], correct: 0 },
  { q: "In complexity theory, what does 'O(1)' represent?", opts: ["Linear time","Exponential time","Constant time","Quadratic time"], correct: 2 },
  { q: "What cognitive phenomenon makes you notice a concept everywhere after learning it?", opts: ["Dunning-Kruger","Baader-Meinhof","Mandela Effect","Placebo Effect"], correct: 1 },
  { q: "In ML, what is 'overfitting'?", opts: ["Performs well on training but poorly on unseen data","Cannot compile","Underperforms on all data","Too many layers"], correct: 0 },
  { q: "Who is widely considered the first computer programmer?", opts: ["Alan Turing","Charles Babbage","Ada Lovelace","Grace Hopper"], correct: 2 },
  { q: "What is the Schwarzschild radius related to?", opts: ["Star size","Black hole boundary","Atom nucleus","Light speed"], correct: 1 },
];

type GameTab = 'math' | 'word' | 'trivia';

// ─── Shuffle ─────────────────────────────────────────────────────
function shuffle(str: string) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export default function CognitiveGames() {
  const [tab, setTab] = useState<GameTab>('math');
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);

  // Math state
  const [mathLevel, setMathLevel] = useState(1);
  const [mathExpr, setMathExpr] = useState('');
  const [mathAnswer, setMathAnswer] = useState(0);
  const [mathInput, setMathInput] = useState('');
  const [mathFeedback, setMathFeedback] = useState('');

  // Word state
  const [wordLevel, setWordLevel] = useState(1);
  const [scrambled, setScrambled] = useState('');
  const [targetWord, setTargetWord] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [wordFeedback, setWordFeedback] = useState('');

  // Trivia state
  const [triviaLevel, setTriviaLevel] = useState(1);
  const [triviaFeedback, setTriviaFeedback] = useState('');

  const mathInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Generate math problem
  const genMath = useCallback((level: number) => {
    let a: number, b: number, op: string, ans: number, expr: string;
    if (level <= 3) {
      a = Math.floor(Math.random() * (10 * level)) + 1;
      b = Math.floor(Math.random() * (10 * level)) + 1;
      op = Math.random() > 0.5 ? '+' : '-';
      if (op === '-' && b > a) [a, b] = [b, a];
      ans = op === '+' ? a + b : a - b;
      expr = `${a} ${op} ${b}`;
    } else if (level <= 7) {
      a = Math.floor(Math.random() * (5 * (level - 2))) + 2;
      b = Math.floor(Math.random() * (5 * (level - 2))) + 2;
      op = Math.random() > 0.5 ? '×' : '÷';
      if (op === '÷') { ans = a; a = a * b; } else { ans = a * b; }
      expr = `${a} ${op} ${b}`;
    } else {
      ans = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      expr = `X + ${b} = ${ans + b}`;
    }
    setMathExpr(expr);
    setMathAnswer(ans);
    setMathInput('');
    setMathFeedback('');
  }, []);

  // Generate word
  const genWord = useCallback((level: number) => {
    const idx = Math.min(level - 1, DECRYPTOR_DICT.length - 1);
    const word = DECRYPTOR_DICT[idx] || DECRYPTOR_DICT[Math.floor(Math.random() * DECRYPTOR_DICT.length)];
    let s = word;
    let attempts = 0;
    while (s === word && word.length > 1 && attempts < 20) { s = shuffle(word); attempts++; }
    setTargetWord(word);
    setScrambled(s);
    setWordInput('');
    setWordFeedback('');
  }, []);

  useEffect(() => { genMath(mathLevel); }, [mathLevel, genMath]);
  useEffect(() => { genWord(wordLevel); }, [wordLevel, genWord]);

  const triggerFlash = () => { setFlash(true); setTimeout(() => setFlash(false), 500); };
  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };

  const currentTrivia = TRIVIA_DB[Math.min(triviaLevel - 1, TRIVIA_DB.length - 1)];

  const tabConfig = {
    math: { label: 'QUANTUM MATH', color: '#ffaa00', icon: <Calculator className="w-4 h-4" /> },
    word: { label: 'DECRYPTOR', color: '#00f2ff', icon: <Type className="w-4 h-4" /> },
    trivia: { label: 'KNOWLEDGE MATRIX', color: '#ff0055', icon: <HelpCircle className="w-4 h-4" /> },
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Neural <span className="text-amber-400">Training</span></h1>
            <p className="text-gray-500 text-sm">Sharpen your cognitive abilities</p>
          </div>
        </div>
      </motion.div>

      {/* Game Tabs */}
      <div className="flex gap-2">
        {(Object.keys(tabConfig) as GameTab[]).map(key => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all",
              tab === key
                ? "text-background border-transparent"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            )}
            style={tab === key ? { background: tabConfig[key].color, borderColor: tabConfig[key].color } : {}}
          >
            {tabConfig[key].icon}
            {tabConfig[key].label}
          </motion.button>
        ))}
      </div>

      {/* Game Container */}
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={cn(
          "glass rounded-2xl border border-white/10 p-8 text-center relative overflow-hidden transition-all",
          flash && "ring-2 ring-green-500/50"
        )}
      >
        {flash && <div className="absolute inset-0 bg-green-500/10 pointer-events-none animate-pulse" />}

        <AnimatePresence mode="wait">
          {/* MATH */}
          {tab === 'math' && (
            <motion.div key="math" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-amber-400 text-xs font-bold tracking-[4px] uppercase mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                LEVEL {mathLevel}
              </div>
              <div className="text-5xl sm:text-6xl font-black mb-8 tracking-wider" style={{ textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>
                {mathExpr}
              </div>
              <input
                ref={mathInputRef}
                type="number"
                value={mathInput}
                onChange={e => setMathInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (parseInt(mathInput) === mathAnswer) {
                      triggerFlash(); setMathLevel(l => l + 1);
                    } else {
                      triggerShake(); setMathFeedback('INCORRECT. RECALCULATE.');
                    }
                  }
                }}
                placeholder="Enter answer..."
                className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center text-2xl font-bold w-64 outline-none focus:border-amber-500/50 transition-colors"
                autoFocus
              />
              {mathFeedback && <p className="text-red-400 text-sm font-bold mt-3">{mathFeedback}</p>}
            </motion.div>
          )}

          {/* WORD */}
          {tab === 'word' && (
            <motion.div key="word" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-primary text-xs font-bold tracking-[4px] uppercase mb-2">LEVEL {wordLevel}</div>
              <p className="text-gray-500 text-sm mb-6">Decrypt the anagram:</p>
              <div className="text-5xl sm:text-6xl font-black mb-8 tracking-[12px]" style={{ textShadow: '0 0 20px rgba(0,242,255,0.3)' }}>
                {scrambled}
              </div>
              <input
                ref={wordInputRef}
                type="text"
                value={wordInput}
                onChange={e => setWordInput(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (wordInput.trim() === targetWord) {
                      triggerFlash(); setWordLevel(l => l + 1);
                    } else {
                      triggerShake(); setWordFeedback('ACCESS DENIED.');
                    }
                  }
                }}
                placeholder="> DECRYPT..."
                className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center text-2xl font-bold w-72 uppercase outline-none focus:border-primary/50 transition-colors"
                autoFocus
              />
              {wordFeedback && <p className="text-red-400 text-sm font-bold mt-3">{wordFeedback}</p>}
            </motion.div>
          )}

          {/* TRIVIA */}
          {tab === 'trivia' && (
            <motion.div key="trivia" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-red-400 text-xs font-bold tracking-[4px] uppercase mb-4">LEVEL {triviaLevel}</div>
              <p className="text-xl font-semibold mb-8 min-h-[60px]">{currentTrivia.q}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentTrivia.opts.map((opt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (i === currentTrivia.correct) {
                        triggerFlash(); setTriviaLevel(l => l + 1); setTriviaFeedback('');
                      } else {
                        triggerShake(); setTriviaFeedback('INCORRECT DATAPOINT.');
                      }
                    }}
                    className="py-4 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:border-red-500/30 hover:bg-red-500/5 transition-all text-left"
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
              {triviaFeedback && <p className="text-red-400 text-sm font-bold mt-4">{triviaFeedback}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Score card */}
      <div className="flex items-center gap-4 justify-center">
        <div className="glass rounded-xl px-4 py-2 border border-white/10 flex items-center gap-2 text-xs">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-400 font-bold">Math: Lv.{mathLevel}</span>
        </div>
        <div className="glass rounded-xl px-4 py-2 border border-white/10 flex items-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-gray-400 font-bold">Word: Lv.{wordLevel}</span>
        </div>
        <div className="glass rounded-xl px-4 py-2 border border-white/10 flex items-center gap-2 text-xs">
          <Brain className="w-3.5 h-3.5 text-red-400" />
          <span className="text-gray-400 font-bold">Trivia: Lv.{triviaLevel}</span>
        </div>
      </div>
    </div>
  );
}
