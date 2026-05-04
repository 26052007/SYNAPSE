import React, { useEffect, useRef, memo } from 'react';

interface NeuralBgProps {
  intensity?: 'subtle' | 'medium' | 'strong';
  blur?: boolean;
  colorScheme?: 'cyan' | 'fire' | 'rainbow';
}

// Canvas-based neural network background with connected nodes
const NeuralBackground = memo(function NeuralBackground({ intensity = 'subtle', blur = false, colorScheme = 'cyan' }: NeuralBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    // Configuration based on intensity — more visible now
    const config = {
      subtle:  { count: 80,  connectionDist: 140, nodeOpacity: 0.25, lineOpacity: 0.10, speed: 0.35 },
      medium:  { count: 120, connectionDist: 160, nodeOpacity: 0.45, lineOpacity: 0.18, speed: 0.45 },
      strong:  { count: 160, connectionDist: 180, nodeOpacity: 0.6,  lineOpacity: 0.28, speed: 0.55 },
    }[intensity];

    // Color schemes
    const colors = {
      cyan: { node: [0, 242, 255], line1: [0, 242, 255], line2: [112, 0, 255] },
      fire: { node: [255, 100, 0], line1: [255, 0, 85], line2: [255, 170, 0] },
      rainbow: { node: [0, 242, 255], line1: [255, 0, 85], line2: [0, 242, 255] },
    }[colorScheme];

    // Create neural nodes
    const nodes: { x: number; y: number; vx: number; vy: number; r: number; pulse: number; pulseSpeed: number; colorIdx: number }[] = [];
    for (let i = 0; i < config.count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        r: Math.random() * 2.2 + 0.6,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.025 + 0.008,
        colorIdx: Math.random(),
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      // Update and draw nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;

        // Bounce off edges
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));

        // Pulsing opacity
        const pulseAlpha = (Math.sin(n.pulse) * 0.5 + 0.5) * config.nodeOpacity;

        // Choose node color based on scheme
        const nc = colorScheme === 'rainbow' 
          ? (n.colorIdx > 0.5 ? colors.line1 : colors.line2)
          : colors.node;

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${nc[0]}, ${nc[1]}, ${nc[2]}, ${pulseAlpha})`;
        ctx!.fill();

        // Draw glow for stronger intensities
        if (intensity !== 'subtle' && pulseAlpha > 0.3) {
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${nc[0]}, ${nc[1]}, ${nc[2]}, ${pulseAlpha * 0.1})`;
          ctx!.fill();
        }
      });

      // Draw connections (neural links)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < config.connectionDist) {
            const alpha = (1 - dist / config.connectionDist) * config.lineOpacity;

            // Gradient line
            const gradient = ctx!.createLinearGradient(
              nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y
            );
            const c1 = colors.line1;
            const c2 = colors.line2;
            gradient.addColorStop(0, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${alpha * 0.6})`);

            ctx!.beginPath();
            ctx!.strokeStyle = gradient;
            ctx!.lineWidth = intensity === 'subtle' ? 0.6 : 0.8;
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity, colorScheme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        background: 'transparent',
        filter: blur ? 'blur(2.5px)' : 'none',
      }}
    />
  );
});

export default NeuralBackground;
