'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/useGame';
import { useAuthStore } from '@/store/useAuth';
import { SpinWheelCanvas } from '@/components/SpinWheelCanvas';
import { PlayerCard } from '@/components/PlayerCard';

export default function GameRoom() {
  const params = useParams();
  const wheelId = params.id as string;
  const router = useRouter();
  
  const { user, token } = useAuthStore();
  const { 
    status, 
    participants, 
    winnerUserId, 
    logs, 
    nextEliminationIn, 
    setWheel, 
    decrementTimer 
  } = useGameStore();

  useSocket(wheelId);

  useEffect(() => {
    // Initial fetch of wheel state
    const fetchWheel = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiUrl}/wheel/active`);
        const data = await res.json();
        const wheel = data.find((w: any) => w.id === wheelId);
        if (wheel) {
          setWheel(wheel);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWheel();
  }, [wheelId, setWheel]);

  useEffect(() => {
    if (status === 'SPINNING') {
      const interval = setInterval(() => {
        decrementTimer();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, decrementTimer]);

  const forceStart = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      await fetch(`${apiUrl}/wheel/${wheelId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-8 min-h-screen flex flex-col lg:flex-row gap-8">
      {/* Left Panel: Game state and Wheel */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <button onClick={() => router.push('/')} className="absolute top-0 left-0 text-gray-400 hover:text-white">
          &larr; Back to Lobby
        </button>
        
        <h1 className="text-4xl font-orbitron text-[var(--color-primary)] font-bold mb-4">Spin Wheel Area</h1>
        <div className="glass px-6 py-2 rounded-full mb-8 text-lg font-bold uppercase tracking-widest text-[var(--color-secondary)]">
          {status}
        </div>

        {status === 'WAITING' && (
          <div className="text-center mb-8">
            <p className="text-xl mb-4">Waiting for players...</p>
            {user?.role === 'ADMIN' && (
              <button onClick={forceStart} className="bg-red-500 text-white px-6 py-2 rounded font-bold uppercase hover:bg-red-600 transition-colors">
                Force Start Now
              </button>
            )}
          </div>
        )}

        {(status === 'SPINNING' || status === 'COMPLETED') && (
          <>
            {nextEliminationIn !== null && nextEliminationIn > 0 && (
              <div className="text-2xl font-bold font-orbitron mb-4 text-red-400">
                Next elimination in: {nextEliminationIn}s
              </div>
            )}
            <SpinWheelCanvas 
              participants={participants} 
              status={status} 
              winnerUserId={winnerUserId} 
            />
          </>
        )}
      </div>

      {/* Right Panel: Players and Event Feed */}
      <div className="w-full lg:w-96 flex flex-col gap-8">
        <div className="glass p-6 rounded-2xl h-1/2 flex flex-col">
          <h3 className="font-orbitron text-xl mb-4 text-[var(--color-primary)]">Players ({participants.length})</h3>
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
            {participants.map(p => (
              <PlayerCard key={p.userId} participant={p} />
            ))}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl h-1/2 flex flex-col">
          <h3 className="font-orbitron text-xl mb-4 text-[var(--color-secondary)]">Event Feed</h3>
          <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1-0">
            {logs.map((log, i) => (
              <div key={i} className="text-sm border-l-2 border-[var(--color-primary)] pl-3 py-1 bg-white/5 rounded-r">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
