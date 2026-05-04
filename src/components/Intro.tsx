import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'motion/react';
import { SynapseLogo } from './SynapseLogo';
import NeuralBackground from './NeuralBackground';

// Pre-generate particle data so it doesn't change on re-render
function createParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 2,
  }));
}

function createOrbitParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * 360,
    radius: 120 + Math.random() * 80,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 6 + 8,
    opacity: Math.random() * 0.4 + 0.2,
  }));
}

export default function Intro({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [step, setStep] = useState(0);

  const particles = useMemo(() => createParticles(40), []);
  const orbitParticles = useMemo(() => createOrbitParticles(16), []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 3200),
      setTimeout(() => setStep(3), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Smoother scroll-linked transforms with wider ranges for gradual feel
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.6, 0.85], [1, 1, 1.05, 50]);
  const opacity = useTransform(scrollYProgress, [0.6, 0.82], [1, 0]);
  const blur = useTransform(scrollYProgress, [0.6, 0.85], [0, 30]);
  const bgOpacity = useTransform(scrollYProgress, [0.75, 0.95], [1, 0]);
  const ringScale = useTransform(scrollYProgress, [0.5, 0.8], [1, 3]);
  const ringOpacity = useTransform(scrollYProgress, [0.5, 0.8], [0.3, 0]);

  // Ultra-smooth spring config for buttery animations
  const smoothSpring = { damping: 40, stiffness: 80, mass: 0.8 };
  const smoothScale = useSpring(scale, smoothSpring);
  const smoothOpacity = useSpring(opacity, smoothSpring);
  const smoothBlur = useSpring(blur, smoothSpring);
  const smoothBgOpacity = useSpring(bgOpacity, smoothSpring);
  const smoothRingScale = useSpring(ringScale, smoothSpring);
  const smoothRingOpacity = useSpring(ringOpacity, smoothSpring);

  // Scroll indicator animation
  const scrollIndicatorY = useTransform(scrollYProgress, [0, 0.1], [0, -20]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (v >= 0.96) {
        onComplete();
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress, onComplete]);

  return (
    <div ref={containerRef} className="relative h-[500vh] bg-background">
      {/* Full-screen sticky viewport */}
      <motion.div 
        className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden"
        style={{ opacity: smoothBgOpacity }}
      >
        {/* Neural network background that gets more visible as you scroll */}
        <NeuralBackground intensity="medium" />
        {/* Central content with scroll-zoom effect */}
        <motion.div 
          className="text-center z-10 w-full px-4 flex flex-col items-center justify-center"
          style={{ 
            scale: smoothScale, 
            opacity: smoothOpacity, 
            filter: `blur(${smoothBlur}px)`,
          }}
        >
          <div className="relative h-44 flex items-center justify-center w-full">
            {/* Step 1: Welcome */}
            <AnimatePresence>
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -40, scale: 1.05, filter: "blur(8px)" }}
                  transition={{ 
                    duration: 1.4, 
                    ease: [0.16, 1, 0.3, 1],
                    exit: { duration: 0.8, ease: [0.4, 0, 1, 1] }
                  }}
                  className="absolute flex flex-col items-center"
                >
                  <motion.div 
                    className="w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent mb-8"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-white whitespace-nowrap">
                    Welcome
                  </h1>
                  <motion.div 
                    className="w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent mt-8"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 2: We are here for you */}
            <AnimatePresence>
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -40, scale: 1.05, filter: "blur(8px)" }}
                  transition={{ 
                    duration: 1.4, 
                    ease: [0.16, 1, 0.3, 1],
                    exit: { duration: 0.8, ease: [0.4, 0, 1, 1] } 
                  }}
                  className="absolute flex flex-col items-center"
                >
                  <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-white whitespace-nowrap">
                    We are here for you
                  </h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="text-gray-500 text-lg mt-4 tracking-wide"
                  >
                    Your academic journey, reimagined
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: Synapse Logo Reveal */}
            <AnimatePresence>
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 2.5, 
                    ease: [0.16, 1, 0.3, 1],
                    scale: { type: "spring", damping: 20, stiffness: 60 }
                  }}
                  className="absolute flex flex-col items-center gap-6"
                >
                  {/* Pulsing glow ring behind icon */}
                  <motion.div
                    className="absolute w-24 h-24 rounded-2xl"
                    style={{
                      background: "radial-gradient(circle, rgba(0,242,255,0.3) 0%, transparent 70%)",
                      scale: smoothRingScale,
                      opacity: smoothRingOpacity,
                    }}
                  />

                  <motion.div 
                    className="relative"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <SynapseLogo size={80} showText={false} />
                  </motion.div>

                  {/* Brand name with letter-by-letter reveal */}
                  <div className="flex items-center">
                    {"Synapse".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 20, rotateX: -90 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ 
                          delay: 0.6 + i * 0.08,
                          duration: 0.8,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        className="text-7xl md:text-9xl font-bold tracking-tighter gradient-text inline-block"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>

                  <motion.p 
                    initial={{ opacity: 0, letterSpacing: "0.8em" }}
                    animate={{ opacity: 0.6, letterSpacing: "0.5em" }}
                    transition={{ delay: 1.8, duration: 1.5, ease: "easeOut" }}
                    className="text-gray-500 text-xs uppercase mt-2"
                  >
                    Establishing Neural Link...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Scroll down indicator */}
        {step >= 3 && (
          <motion.div
            className="absolute bottom-12 flex flex-col items-center gap-3 z-20"
            style={{ y: scrollIndicatorY, opacity: scrollIndicatorOpacity }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 2.5, duration: 1 }}
              className="text-gray-600 text-[11px] uppercase tracking-[0.4em] font-medium"
            >
              Scroll to Enter
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 2.8, duration: 1 }}
              className="relative w-6 h-10 rounded-full border border-white/20 flex items-start justify-center p-1.5"
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ y: [0, 16, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
              />
            </motion.div>
          </motion.div>
        )}

        {/* Animated Background for Intro */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Central radial glow */}
          <motion.div 
            className="absolute inset-0"
            animate={{
              background: step >= 3 
                ? [
                    "radial-gradient(circle at 50% 50%, rgba(0,242,255,0.08) 0%, transparent 60%)",
                    "radial-gradient(circle at 50% 50%, rgba(112,0,255,0.06) 0%, transparent 60%)",
                    "radial-gradient(circle at 50% 50%, rgba(0,242,255,0.08) 0%, transparent 60%)",
                  ]
                : "radial-gradient(circle at 50% 50%, rgba(0,242,255,0.04) 0%, transparent 70%)"
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Floating particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.x + "%",
                top: p.y + "%",
                width: p.size,
                height: p.size,
                background: p.id % 3 === 0 
                  ? "rgba(0, 242, 255, 0.4)" 
                  : p.id % 3 === 1 
                  ? "rgba(112, 0, 255, 0.3)" 
                  : "rgba(255, 255, 255, 0.15)",
              }}
              animate={{
                opacity: [0, 0.8, 0],
                y: [0, -30, 0],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: p.delay,
              }}
            />
          ))}

          {/* Orbiting particles around logo (visible in step 3) */}
          {step >= 3 && orbitParticles.map((p) => (
            <motion.div
              key={`orbit-${p.id}`}
              className="absolute rounded-full"
              style={{
                left: "50%",
                top: "50%",
                width: p.size,
                height: p.size,
                background: p.id % 2 === 0 ? "rgba(0, 242, 255, 0.5)" : "rgba(112, 0, 255, 0.4)",
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, p.opacity, 0],
                x: [
                  Math.cos((p.angle * Math.PI) / 180) * p.radius,
                  Math.cos(((p.angle + 360) * Math.PI) / 180) * p.radius,
                ],
                y: [
                  Math.sin((p.angle * Math.PI) / 180) * p.radius,
                  Math.sin(((p.angle + 360) * Math.PI) / 180) * p.radius,
                ],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear",
                delay: p.id * 0.2,
              }}
            />
          ))}

          {/* Horizontal scan lines */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`scan-${i}`}
              className="absolute left-0 right-0 h-[1px]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.06), transparent)",
                top: 30 + i * 20 + "%",
              }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 1.5,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
