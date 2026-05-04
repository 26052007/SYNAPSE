import React from 'react';

// SVG Brain-Neuron Logo inspired by the provided image
// Neuron dendrites on left + brain shape with neural pulse on top + "SYNAPSE" text
export function SynapseLogo({ size = 40, showText = true, className = '' }: { size?: number; showText?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Neuron body (center) */}
        <circle cx="22" cy="32" r="6" fill="url(#neuronGrad)" opacity="0.9" />
        
        {/* Dendrites (branching lines from neuron body) */}
        <g stroke="url(#dendGrad)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85">
          {/* Left dendrites */}
          <path d="M16 32 Q8 28 3 22" />
          <path d="M16 32 Q6 34 2 38" />
          <path d="M16 32 Q10 24 6 18" />
          <path d="M16 32 Q8 40 4 46" />
          <path d="M18 26 Q14 18 8 12" />
          <path d="M18 38 Q12 44 6 50" />
          {/* Sub-branches */}
          <path d="M3 22 Q1 18 2 14" strokeWidth="1.2" />
          <path d="M6 18 Q4 14 6 10" strokeWidth="1.2" />
          <path d="M8 12 Q10 8 8 4" strokeWidth="1.2" />
          <path d="M2 38 Q0 42 2 46" strokeWidth="1.2" />
          <path d="M4 46 Q2 50 4 54" strokeWidth="1.2" />
          <path d="M6 50 Q8 54 6 58" strokeWidth="1.2" />
        </g>
        
        {/* Axon (going right from neuron body) */}
        <path d="M28 32 Q32 30 36 32 Q40 34 44 32" stroke="url(#dendGrad)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        
        {/* Brain outline (top right) */}
        <path d="M30 10 Q36 6 42 10 Q48 14 46 22 Q44 28 38 28 Q34 28 32 24 Q30 20 30 14 Z" 
          stroke="url(#brainGrad)" strokeWidth="1.6" fill="none" opacity="0.8" />
        <path d="M32 10 Q38 8 44 12 Q46 16 44 20" 
          stroke="url(#brainGrad)" strokeWidth="1.2" fill="none" opacity="0.6" />
        
        {/* Neural pulse wave (inside brain) */}
        <path d="M33 18 L35 14 L37 20 L39 12 L41 18 L43 16" 
          stroke="url(#pulseGrad)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        
        {/* Synapse connection points (glowing dots) */}
        <circle cx="22" cy="32" r="2.5" fill="#00f2ff" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="44" cy="32" r="2" fill="#00f2ff" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="38" cy="14" r="1.5" fill="#c8a44e" opacity="0.6">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Gradients */}
        <defs>
          <linearGradient id="neuronGrad" x1="16" y1="26" x2="28" y2="38">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7000ff" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="dendGrad" x1="0" y1="0" x2="30" y2="50">
            <stop offset="0%" stopColor="#00f2ff" />
            <stop offset="100%" stopColor="#0070cc" />
          </linearGradient>
          <linearGradient id="brainGrad" x1="30" y1="6" x2="48" y2="28">
            <stop offset="0%" stopColor="#c8a44e" />
            <stop offset="100%" stopColor="#dab86a" />
          </linearGradient>
          <linearGradient id="pulseGrad" x1="33" y1="12" x2="43" y2="20">
            <stop offset="0%" stopColor="#c8a44e" />
            <stop offset="100%" stopColor="#e8c85e" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className="text-2xl font-bold tracking-tighter text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
          SYNAPSE
        </span>
      )}
    </div>
  );
}

// Small icon-only version for favicons/compact spaces
export function SynapseIcon({ size = 24 }: { size?: number }) {
  return <SynapseLogo size={size} showText={false} />;
}

export default SynapseLogo;
