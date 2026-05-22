import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuth';
import { useGameStore } from '../store/useGame';

export const useSocket = (wheelId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const { user, updateCoins } = useAuthStore();
  const gameStore = useGameStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket', socket.id);
      if (user) {
        socket.emit('joinUserRoom', user.id);
      }
      if (wheelId) {
        socket.emit('joinWheelRoom', wheelId);
      }
    });

    socket.on('wheel:playerJoined', (payload) => {
      gameStore.addParticipant(payload);
    });

    socket.on('wheel:started', (payload) => {
      gameStore.setStarted(payload.eliminationSequence);
    });

    socket.on('wheel:elimination', (payload) => {
      gameStore.setElimination(payload.eliminatedUserId, payload.remainingPlayers, payload.nextEliminationIn);
    });

    socket.on('wheel:winner', (payload) => {
      gameStore.setWinner(payload.winnerUserId, payload.prize);
    });

    socket.on('wheel:aborted', () => {
      gameStore.setAborted();
    });

    socket.on('wheel:coinUpdate', (payload) => {
      updateCoins(payload.newBalance);
    });

    return () => {
      socket.disconnect();
    };
  }, [wheelId, user]);

  return socketRef.current;
};
