'use client';

import { Participant } from '../store/useGame';
import { cn } from '../lib/utils';

export function PlayerCard({ participant }: { participant: Participant }) {
  return (
    <div className={cn(
      "glass p-4 rounded-xl flex items-center justify-between transition-all duration-300",
      participant.isEliminated ? "opacity-40 grayscale" : "border-[var(--color-primary)]"
    )}>
      <span className="font-orbitron font-medium text-lg">
        {participant.user?.username || 'Unknown Player'}
      </span>
      {participant.isEliminated ? (
        <span className="text-red-400 text-sm font-bold uppercase">Eliminated</span>
      ) : (
        <span className="text-[var(--color-primary)] text-sm font-bold uppercase">Active</span>
      )}
    </div>
  );
}
