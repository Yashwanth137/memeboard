'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface InteractiveDoorProps {
  isOpen: boolean;
}

export default function InteractiveDoor({ isOpen }: InteractiveDoorProps) {
  return (
    <div className="relative w-full max-w-[250px] sm:max-w-[275px] xl:max-w-[320px] aspect-[1/2] mx-auto perspective-[1200px]">
      
      {/* Outer Door Frame / Wall Cutout */}
      <div className="absolute inset-0 rounded-t-full ring-1 ring-[#b8ae9d] border-[12px] sm:border-[14px] xl:border-[16px] border-[#e8e2d4] bg-bg-cream shadow-[inset_0_4px_20px_rgba(0,0,0,0.4),0_10px_30px_rgba(0,0,0,0.1)] flex items-end justify-center overflow-hidden">
        
        {/* Bright light behind the door */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 bg-white"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gold-glow/50 to-transparent blur-2xl" />
        </motion.div>
        
        {/* The Door itself */}
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: isOpen ? -105 : 0 }}
          transition={{ duration: 1.2, type: "spring", bounce: 0.15, stiffness: 40 }}
          className="relative w-[calc(100%-8px)] h-[calc(100%-8px)] mb-[4px] rounded-t-full bg-door-purple border-2 border-door-purple-dark shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] origin-left flex flex-col items-center z-10 overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          
          {/* Wood paneling details (SVG overlay) */}
          <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay" viewBox="0 0 100 200" preserveAspectRatio="none">
            {/* Vertical planks */}
            <line x1="20" y1="0" x2="20" y2="200" stroke="#000" strokeWidth="1" />
            <line x1="40" y1="0" x2="40" y2="200" stroke="#000" strokeWidth="1" />
            <line x1="60" y1="0" x2="60" y2="200" stroke="#000" strokeWidth="1" />
            <line x1="80" y1="0" x2="80" y2="200" stroke="#000" strokeWidth="1" />
            {/* Arch curve outline */}
            <path d="M 10 50 A 40 40 0 0 1 90 50 L 90 190 L 10 190 Z" fill="none" stroke="#000" strokeWidth="2" />
          </svg>

          {/* Door Handle */}
          <div className="absolute top-[55%] right-4 w-3 h-12 bg-[#8b7355] rounded-full shadow-lg border border-[#5c4a3d]" />
          <div className="absolute top-[58%] right-2 w-5 h-2 bg-[#8b7355] rounded-full shadow-lg" />

          {/* Glowing Neon Bolt */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ 
                filter: isOpen 
                  ? "drop-shadow(0 0 30px rgba(251, 191, 36, 1)) drop-shadow(0 0 60px rgba(251, 191, 36, 0.8)) brightness(1.5)" 
                  : "drop-shadow(0 0 15px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 30px rgba(251, 191, 36, 0.3)) brightness(1)" 
              }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="w-20 h-20 text-gold-glow fill-gold-glow" strokeWidth={1} />
            </motion.div>
          </div>

          {/* 3D Edge Thickness (visible when open) */}
          <div 
            className="absolute top-0 right-0 w-[20px] h-full bg-door-purple-dark origin-right" 
            style={{ transform: 'rotateY(90deg)', transformOrigin: 'right' }} 
          />
        </motion.div>
      </div>

      {/* Welcome Mat */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[110%] h-[20px] bg-[#a88a5b] border border-[#7d653f]/30 rounded-sm transform perspective-[500px] rotateX-[60deg] shadow-[0_10px_20px_rgba(0,0,0,0.2)] flex items-center justify-center">
        <span className="text-[#5c4a3d] text-[10px] font-bold uppercase tracking-widest opacity-80">Come on in ♡</span>
      </div>

    </div>
  );
}
