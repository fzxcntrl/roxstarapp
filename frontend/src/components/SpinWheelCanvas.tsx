'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '../store/useGame';

interface SpinWheelCanvasProps {
  participants: Participant[];
  status: string;
  winnerUserId: string | null;
}

export function SpinWheelCanvas({ participants, status, winnerUserId }: SpinWheelCanvasProps) {
  const activeParticipants = participants.filter(p => !p.isEliminated);
  const total = activeParticipants.length || 1;
  const angle = 360 / total;

  return (
    <div className="relative w-96 h-96 mx-auto my-12">
      {status === 'COMPLETED' && winnerUserId ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-primary text-background rounded-full font-bold text-2xl z-20 shadow-[0_0_50px_var(--color-primary)]"
        >
          WINNER!
        </motion.div>
      ) : null}

      <motion.div 
        className="w-full h-full rounded-full border-4 border-[var(--color-secondary)] relative overflow-hidden"
        animate={status === 'SPINNING' ? { rotate: 360 } : { rotate: 0 }}
        transition={{ 
          repeat: status === 'SPINNING' ? Infinity : 0, 
          duration: 2, 
          ease: "linear" 
        }}
      >
        <AnimatePresence>
          {activeParticipants.map((p, i) => (
            <motion.div
              key={p.userId}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute w-full h-full origin-center"
              style={{
                transform: `rotate(${i * angle}deg)`,
                clipPath: `polygon(50% 50%, 100% 0, 100% ${Math.tan((angle/2) * Math.PI / 180) * 50 + 50}%)`,
                backgroundColor: `hsl(${(i * 137.5) % 360}, 70%, 50%)`,
              }}
            >
              <div 
                className="absolute text-white font-bold text-sm"
                style={{ 
                  transform: `rotate(${angle / 2}deg) translate(100px, 150px)` 
                }}
              >
                {p.user?.username || 'Player'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {/* Center Pin */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full z-10 shadow-lg border-2 border-background"></div>
    </div>
  );
}
