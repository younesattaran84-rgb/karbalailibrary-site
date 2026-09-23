import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { LibraryLogo } from './LibraryLogo';
import { HeroSingle3DBook } from './Hero3DBooks';

interface LoadingScreenProps {
  onFinish?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish }) => {
  const [isSplitting, setIsSplitting] = useState(false);
  const [isExited, setIsExited] = useState(false);
  const [bookPhase, setBookPhase] = useState<'entering' | 'orbiting' | 'departing'>('entering');

  useEffect(() => {
    // 1. Books fly in from the 4 corners of the screen towards the logo
    const enterTimer = setTimeout(() => {
      setBookPhase('orbiting');
    }, 120);

    // 2. Books fly away / depart after orbiting around the logo
    const departTimer = setTimeout(() => {
      setBookPhase('departing');
    }, 2400);

    // 3. Curtains split open to reveal the site
    const splitTimer = setTimeout(() => {
      triggerSplit();
    }, 2900);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(departTimer);
      clearTimeout(splitTimer);
    };
  }, []);

  const triggerSplit = () => {
    if (isSplitting) return;
    setBookPhase('departing');
    setIsSplitting(true);
    setTimeout(() => {
      setIsExited(true);
      if (onFinish) onFinish();
    }, 850);
  };

  if (isExited) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto">
      {/* LEFT SPLIT CURTAIN */}
      <motion.div
        initial={{ x: 0 }}
        animate={isSplitting ? { x: '-100%' } : { x: 0 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#021f1e] via-[#042f2e] to-[#063f3d] border-r border-[#84cc16]/40 shadow-2xl flex items-center justify-end z-40 overflow-hidden"
      >
        {/* Ambient Glow & Grid lines on left */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[#0d9488]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-[#84cc16]/10 blur-3xl pointer-events-none" />
      </motion.div>

      {/* RIGHT SPLIT CURTAIN */}
      <motion.div
        initial={{ x: 0 }}
        animate={isSplitting ? { x: '100%' } : { x: 0 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#021f1e] via-[#042f2e] to-[#063f3d] border-l border-[#84cc16]/40 shadow-2xl flex items-center justify-start z-40 overflow-hidden"
      >
        {/* Ambient Glow & Grid lines on right */}
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#0d9488]/15 blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-[#84cc16]/10 blur-3xl pointer-events-none" />
      </motion.div>

      {/* CENTER GLOW SEAM */}
      {!isSplitting && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0.4, 0.9, 0.4], scaleY: 1 }}
          transition={{
            opacity: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
            scaleY: { duration: 0.6 },
          }}
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-[#84cc16] to-transparent z-40 shadow-[0_0_15px_#84cc16]"
        />
      )}

      {/* FLOATING 3D ELEMENTS & HERO LOGO */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          isSplitting
            ? { opacity: 0, scale: 1.25, filter: 'blur(8px)' }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: isSplitting ? 0.6 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 pointer-events-none"
      >
        {/* Centerpiece: Glowing Badge + Logo with 4 3D Books Flying From Corners to Surround It */}
        <div className="relative flex flex-col items-center text-center">
          
          {/* Logo & Surrounding 3D Books Container */}
          <div className="relative mb-6 flex items-center justify-center">
            
            {/* Luminous Pulsating Halo */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                repeat: Infinity,
                duration: 10,
                ease: 'linear',
              }}
              className="absolute -inset-6 rounded-full bg-gradient-to-r from-[#84cc16]/30 via-[#0d9488]/40 to-[#eab308]/30 blur-xl"
            />
            
            {/* Central Logo */}
            <div className="golden-rotating-border-container p-1 rounded-3xl shadow-2xl relative z-20">
              <div className="bg-[#042f2e] p-4 rounded-[calc(1.5rem-4px)] flex items-center justify-center">
                <LibraryLogo size="lg" showText={false} />
              </div>
            </div>

            {/* 3D BOOK 1: Top-Right Corner -> Surrounds Logo -> Flies Out */}
            <motion.div
              initial={{ x: '55vw', y: '-55vh', scale: 0.25, opacity: 0, rotate: 60 }}
              animate={
                bookPhase === 'entering'
                  ? { x: '55vw', y: '-55vh', scale: 0.25, opacity: 0, rotate: 60 }
                  : bookPhase === 'orbiting'
                  ? { x: 120, y: -65, scale: 0.85, opacity: 1, rotate: 14 }
                  : { x: '70vw', y: '-70vh', scale: 1.3, opacity: 0, rotate: 90 }
              }
              transition={{
                x: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.05 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                y: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.05 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                scale: { duration: 0.5 },
                opacity: { duration: 0.4 },
                rotate: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12 } : { duration: 0.6 },
              }}
              className="absolute z-30 pointer-events-auto filter drop-shadow-2xl"
            >
              <HeroSingle3DBook
                bookIndex={0}
                width={85}
                height={120}
                depth={18}
                initialRotateY={-22}
                initialRotateX={10}
                initialRotateZ={6}
                floatingDuration={4}
              />
            </motion.div>

            {/* 3D BOOK 2: Top-Left Corner -> Surrounds Logo -> Flies Out */}
            <motion.div
              initial={{ x: '-55vw', y: '-55vh', scale: 0.25, opacity: 0, rotate: -60 }}
              animate={
                bookPhase === 'entering'
                  ? { x: '-55vw', y: '-55vh', scale: 0.25, opacity: 0, rotate: -60 }
                  : bookPhase === 'orbiting'
                  ? { x: -120, y: -65, scale: 0.85, opacity: 1, rotate: -14 }
                  : { x: '-70vw', y: '-70vh', scale: 1.3, opacity: 0, rotate: -90 }
              }
              transition={{
                x: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.1 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                y: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.1 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                scale: { duration: 0.5 },
                opacity: { duration: 0.4 },
                rotate: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12 } : { duration: 0.6 },
              }}
              className="absolute z-30 pointer-events-auto filter drop-shadow-2xl"
            >
              <HeroSingle3DBook
                bookIndex={1}
                width={90}
                height={125}
                depth={20}
                initialRotateY={20}
                initialRotateX={-8}
                initialRotateZ={-5}
                floatingDuration={4.5}
              />
            </motion.div>

            {/* 3D BOOK 3: Bottom-Right Corner -> Surrounds Logo -> Flies Out */}
            <motion.div
              initial={{ x: '55vw', y: '55vh', scale: 0.25, opacity: 0, rotate: 75 }}
              animate={
                bookPhase === 'entering'
                  ? { x: '55vw', y: '55vh', scale: 0.25, opacity: 0, rotate: 75 }
                  : bookPhase === 'orbiting'
                  ? { x: 125, y: 70, scale: 0.85, opacity: 1, rotate: -12 }
                  : { x: '70vw', y: '70vh', scale: 1.3, opacity: 0, rotate: 105 }
              }
              transition={{
                x: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.15 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                y: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.15 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                scale: { duration: 0.5 },
                opacity: { duration: 0.4 },
                rotate: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12 } : { duration: 0.6 },
              }}
              className="absolute z-30 pointer-events-auto filter drop-shadow-2xl"
            >
              <HeroSingle3DBook
                bookIndex={2}
                width={85}
                height={120}
                depth={18}
                initialRotateY={-18}
                initialRotateX={12}
                initialRotateZ={-8}
                floatingDuration={4.8}
              />
            </motion.div>

            {/* 3D BOOK 4: Bottom-Left Corner -> Surrounds Logo -> Flies Out */}
            <motion.div
              initial={{ x: '-55vw', y: '55vh', scale: 0.25, opacity: 0, rotate: -75 }}
              animate={
                bookPhase === 'entering'
                  ? { x: '-55vw', y: '55vh', scale: 0.25, opacity: 0, rotate: -75 }
                  : bookPhase === 'orbiting'
                  ? { x: -125, y: 70, scale: 0.85, opacity: 1, rotate: 12 }
                  : { x: '-70vw', y: '70vh', scale: 1.3, opacity: 0, rotate: -105 }
              }
              transition={{
                x: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.2 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                y: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12, delay: 0.2 } : { duration: 0.65, ease: [0.7, 0, 0.3, 1] },
                scale: { duration: 0.5 },
                opacity: { duration: 0.4 },
                rotate: bookPhase === 'orbiting' ? { type: 'spring', stiffness: 50, damping: 12 } : { duration: 0.6 },
              }}
              className="absolute z-30 pointer-events-auto filter drop-shadow-2xl"
            >
              <HeroSingle3DBook
                bookIndex={0}
                width={80}
                height={115}
                depth={16}
                initialRotateY={16}
                initialRotateX={-10}
                initialRotateZ={6}
                floatingDuration={5.2}
              />
            </motion.div>
          </div>

          {/* Typography */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-1.5"
          >
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>صحن واژه‌ها</span>
              <Sparkles className="w-5 h-5 text-[#84cc16] animate-spin" />
            </h1>
            <p className="text-sm sm:text-base font-bold text-[#99f6e4]">
              کتابخانه شهید احسان کربلایی‌پور
            </p>
          </motion.div>

          {/* Progress / Pulse Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <div className="w-36 h-1 rounded-full bg-[#073834] overflow-hidden border border-[#0d9488]/30">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: 'easeInOut',
                }}
                className="w-full h-full bg-gradient-to-r from-[#0d9488] via-[#84cc16] to-[#a3e635]"
              />
            </div>
            <span className="text-[11px] text-[#5eead4]/80 font-medium">
              در حال گشودن گنجینه کتابخانه...
            </span>
          </motion.div>

          {/* Direct Skip Button (Pointer-events active) */}
          <button
            type="button"
            onClick={triggerSplit}
            className="mt-6 pointer-events-auto px-4 py-1.5 rounded-full bg-[#073834]/80 hover:bg-[#0d9488]/40 border border-[#0d9488]/40 text-[#99f6e4] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
          >
            <span>ورود مستقیم</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
