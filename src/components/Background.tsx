import React, { useMemo } from 'react';
import { motion } from 'motion/react';

// Pre-generate all random values
function createParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.3 + 0.05,
    duration: Math.random() * 12 + 12,
    delay: Math.random() * 15,
  }));
}

function createLines(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    y: Math.random() * 100,
    targetY: Math.random() * 100 - 10,
    duration: Math.random() * 8 + 18,
    delay: Math.random() * 25,
    width: Math.random() * 200 + 100,
  }));
}

export default function Background() {
  const particles = useMemo(() => createParticles(40), []);
  const lines = useMemo(() => createLines(4), []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background pointer-events-none">
      {/* Radial Gradients with breathing animation */}
      <motion.div 
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
        animate={{
          background: [
            "radial-gradient(circle, rgba(0,242,255,0.05) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(0,242,255,0.08) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(0,242,255,0.05) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
        animate={{
          background: [
            "radial-gradient(circle, rgba(112,0,255,0.04) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(112,0,255,0.07) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(112,0,255,0.04) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      
      {/* Grid */}
      <div className="absolute inset-0 grid-bg opacity-20" />

      {/* Floating Particles - smoother with easeInOut */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x + "vw",
            top: p.y + "vh",
            width: p.size,
            height: p.size,
            background: p.id % 2 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,242,255,0.08)",
          }}
          animate={{
            y: [0, -80, 0],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      {/* Moving Light Lines - smoother & more subtle */}
      {lines.map((l) => (
        <motion.div
          key={`line-${l.id}`}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-primary/10 to-transparent"
          style={{ width: l.width, rotate: -45 }}
          initial={{ 
            x: "-200px", 
            y: l.y + "vh",
          }}
          animate={{
            x: "120vw",
            y: l.targetY + "vh",
          }}
          transition={{
            duration: l.duration,
            repeat: Infinity,
            ease: "linear",
            delay: l.delay,
          }}
        />
      ))}
    </div>
  );
}
