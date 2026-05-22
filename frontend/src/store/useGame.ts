import { create } from 'zustand';

export type WheelStatus = 'WAITING' | 'ACTIVE' | 'SPINNING' | 'COMPLETED' | 'ABORTED';

export interface Participant {
  id: string;
  userId: string;
  user?: { username: string };
  isEliminated: boolean;
}

interface GameState {
  wheelId: string | null;
  status: WheelStatus;
  participants: Participant[];
  eliminationSequence: string[];
  currentEliminationIndex: number;
  winnerUserId: string | null;
  logs: string[];
  nextEliminationIn: number | null;
  setWheel: (wheel: any) => void;
  addParticipant: (participant: Participant) => void;
  setStarted: (sequence: string[]) => void;
  setElimination: (userId: string, remainingPlayers: string[], nextIn: number) => void;
  setWinner: (userId: string, prize: number) => void;
  setAborted: () => void;
  decrementTimer: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  wheelId: null,
  status: 'WAITING',
  participants: [],
  eliminationSequence: [],
  currentEliminationIndex: 0,
  winnerUserId: null,
  logs: [],
  nextEliminationIn: null,

  setWheel: (wheel) => set({
    wheelId: wheel.id,
    status: wheel.status,
    participants: wheel.participants || [],
  }),

  addParticipant: (p) => set((state) => {
    // avoid duplicates
    if (state.participants.some(existing => existing.id === p.id)) return state;
    return {
      participants: [...state.participants, p],
      logs: [...state.logs, `${p.user?.username || 'A player'} joined the game.`]
    };
  }),

  setStarted: (sequence) => set((state) => ({
    status: 'SPINNING',
    eliminationSequence: sequence,
    logs: [...state.logs, 'The wheel has started spinning!']
  })),

  setElimination: (userId, remainingPlayers, nextIn) => set((state) => {
    const p = state.participants.find(p => p.userId === userId);
    return {
      participants: state.participants.map(p => p.userId === userId ? { ...p, isEliminated: true } : p),
      currentEliminationIndex: state.currentEliminationIndex + 1,
      logs: [...state.logs, `${p?.user?.username || 'A player'} was eliminated.`],
      nextEliminationIn: nextIn
    };
  }),

  setWinner: (userId, prize) => set((state) => {
    const p = state.participants.find(p => p.userId === userId);
    return {
      status: 'COMPLETED',
      winnerUserId: userId,
      logs: [...state.logs, `${p?.user?.username || 'A player'} won ${prize} coins!`],
      nextEliminationIn: null
    };
  }),

  setAborted: () => set((state) => ({
    status: 'ABORTED',
    logs: [...state.logs, 'The game was aborted. Coins refunded.']
  })),

  decrementTimer: () => set((state) => ({
    nextEliminationIn: state.nextEliminationIn ? state.nextEliminationIn - 1 : null
  }))
}));
