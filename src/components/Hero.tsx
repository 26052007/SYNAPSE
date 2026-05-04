import React, { useState, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Sparkles, Zap, Users, BarChart3 } from 'lucide-react';

// Pre-generate floating elements
function createFloatingElements(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 8 + 8,
    delay: Math.random() * 5,
    color: i % 3 === 0 
      ? "rgba(0, 242, 255, 0.15)" 
      : i % 3 === 1 
      ? "rgba(112, 0, 255, 0.12)" 
      : "rgba(255, 255, 255, 0.06)",
  }));
}

export default function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 120, mass: 0.5 };
  const dx = useSpring(mouseX, springConfig);
  const dy = useSpring(mouseY, springConfig);

  const floatingElements = useMemo(() => createFloatingElements(25), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Subtle parallax for hero content
  const contentX = useTransform(dx, (v) => (v - window.innerWidth / 2) * -0.01);
  const contentY = useTransform(dy, (v) => (v - window.innerHeight / 2) * -0.01);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background grid-bg flex flex-col items-center justify-center px-4">
      {/* Interactive Background Glow - dual layer for depth */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `radial-gradient(800px circle at ${dx}px ${dy}px, rgba(0, 242, 255, 0.08), transparent 60%), radial-gradient(600px circle at ${dx}px ${dy}px, rgba(112, 0, 255, 0.05), transparent 50%)`,
        }}
      />

      {/* Ambient glow orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ left: "10%", top: "20%" }}
        animate={{
          background: [
            "radial-gradient(circle, rgba(0,242,255,0.04) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(0,242,255,0.07) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(0,242,255,0.04) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ right: "5%", bottom: "10%" }}
        animate={{
          background: [
            "radial-gradient(circle, rgba(112,0,255,0.03) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(112,0,255,0.06) 0%, transparent 70%)",
            "radial-gradient(circle, rgba(112,0,255,0.03) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((el) => (
          <motion.div
            key={el.id}
            className="absolute rounded-full"
            style={{
              left: el.x + "%",
              top: el.y + "%",
              width: el.size,
              height: el.size,
              background: el.color,
            }}
            animate={{
              y: [0, -60, 0],
              x: [0, Math.sin(el.id) * 20, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: el.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: el.delay,
            }}
          />
        ))}
      </div>

      {/* Hero Content with subtle parallax */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="z-10 text-center max-w-4xl"
        style={{ x: contentX, y: contentY }}
      >
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
          <span>AI-Powered Productivity for Students</span>
        </motion.div>
        
        {/* Heading with staggered word animation */}
        <div className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.95]">
              Master Your{" "}
              <motion.span 
                className="gradient-text inline-block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                Academic
              </motion.span>
            </h1>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.95]"
          >
            Universe
          </motion.h1>
        </div>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-gray-400 mb-14 max-w-2xl mx-auto leading-relaxed"
        >
          Synapse combines cognitive-load routing, AI syllabus parsing, and social accountability to turn your group projects into high-performance engines.
        </motion.p>

        {/* Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            onClick={onGetStarted}
            className="group relative px-8 py-4 bg-primary text-background font-bold rounded-xl overflow-hidden"
            whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(0, 242, 255, 0.3)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
          >
            <motion.div 
              className="absolute inset-0 bg-white/20"
              initial={{ y: "100%" }}
              whileHover={{ y: "0%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="relative flex items-center gap-2">
              Launch Synapse 
              <motion.span
                className="inline-block"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </span>
          </motion.button>
          
          <motion.a
            href="https://www.youtube.com/watch?v=d5L5rIZiNLI"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-xl glass hover:bg-white/10 transition-colors font-medium border border-white/10"
            whileHover={{ scale: 1.03, borderColor: "rgba(255,255,255,0.25)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
          >
            Watch Demo
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-28 w-full max-w-6xl z-10">
        {[
          { icon: <Zap className="text-primary" />, title: "Zero-Friction Setup", description: "Upload a syllabus PDF and watch AI populate your entire semester in seconds.", delay: 1.3, glow: "rgba(0, 242, 255, 0.1)" },
          { icon: <Users className="text-secondary" />, title: "Anti-Freeloader Tech", description: "Contribution heatmaps ensure every group member pulls their weight fairly.", delay: 1.5, glow: "rgba(112, 0, 255, 0.1)" },
          { icon: <BarChart3 className="text-accent" />, title: "Cognitive Routing", description: "Tasks suggested based on your real-time energy levels and deadlines.", delay: 1.7, glow: "rgba(255, 0, 200, 0.1)" },
        ].map((card, i) => (
          <FeatureCard key={i} {...card} />
        ))}
      </div>

      {/* Bottom scroll fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
    </div>
  );
}

function FeatureCard({ icon, title, description, delay, glow }: { icon: React.ReactNode, title: string, description: string, delay: number, glow: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ 
        y: -8, 
        boxShadow: `0 20px 60px ${glow}`,
        borderColor: "rgba(255,255,255,0.15)",
      }}
      className="glass p-6 rounded-2xl border border-white/5 transition-colors group cursor-default"
    >
      <motion.div 
        className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4"
        whileHover={{ scale: 1.15, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
