'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuth';

interface CoinDistribution {
  winnerPercentage: number;
  adminPercentage: number;
  appPercentage: number;
}

interface GameConfig {
  autoStartDelayMinutes: number;
  eliminationIntervalSeconds: number;
  minParticipants: number;
  maxParticipants: number;
}

export function AdminPanel() {
  const { token, user } = useAuthStore();
  const [coinDistribution, setCoinDistribution] = useState<CoinDistribution>({
    winnerPercentage: 0.8,
    adminPercentage: 0.1,
    appPercentage: 0.1
  });
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    autoStartDelayMinutes: 3,
    eliminationIntervalSeconds: 7,
    minParticipants: 3,
    maxParticipants: 20
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchConfigurations();
    }
  }, [user]);

  const fetchConfigurations = async () => {
    try {
      const [coinRes, gameRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/coin-distribution`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/game`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (coinRes.ok) {
        const coinData = await coinRes.json();
        setCoinDistribution(coinData);
      }

      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGameConfig(gameData);
      }
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
    }
  };

  const updateCoinDistribution = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/coin-distribution`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(coinDistribution)
      });

      if (res.ok) {
        alert('Coin distribution updated successfully!');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to update coin distribution');
    } finally {
      setLoading(false);
    }
  };

  const updateGameConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/game`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gameConfig)
      });

      if (res.ok) {
        alert('Game configuration updated successfully!');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to update game configuration');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="glass p-6 rounded-2xl mb-8">
      <h2 className="text-2xl font-orbitron text-[var(--color-primary)] mb-6">Admin Configuration</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coin Distribution */}
        <div>
          <h3 className="text-xl font-orbitron text-[var(--color-secondary)] mb-4">Coin Distribution</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Winner Pool (%)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={coinDistribution.winnerPercentage}
                onChange={(e) => setCoinDistribution(prev => ({
                  ...prev,
                  winnerPercentage: parseFloat(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Admin Pool (%)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={coinDistribution.adminPercentage}
                onChange={(e) => setCoinDistribution(prev => ({
                  ...prev,
                  adminPercentage: parseFloat(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">App Pool (%)</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={coinDistribution.appPercentage}
                onChange={(e) => setCoinDistribution(prev => ({
                  ...prev,
                  appPercentage: parseFloat(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <button
              onClick={updateCoinDistribution}
              disabled={loading}
              className="w-full bg-[var(--color-secondary)] text-background font-bold py-3 rounded-xl uppercase hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              Update Distribution
            </button>
          </div>
        </div>

        {/* Game Configuration */}
        <div>
          <h3 className="text-xl font-orbitron text-[var(--color-secondary)] mb-4">Game Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Auto-start Delay (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={gameConfig.autoStartDelayMinutes}
                onChange={(e) => setGameConfig(prev => ({
                  ...prev,
                  autoStartDelayMinutes: parseInt(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Elimination Interval (seconds)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={gameConfig.eliminationIntervalSeconds}
                onChange={(e) => setGameConfig(prev => ({
                  ...prev,
                  eliminationIntervalSeconds: parseInt(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min Participants</label>
              <input
                type="number"
                min="2"
                max="100"
                value={gameConfig.minParticipants}
                onChange={(e) => setGameConfig(prev => ({
                  ...prev,
                  minParticipants: parseInt(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Participants</label>
              <input
                type="number"
                min="2"
                max="1000"
                value={gameConfig.maxParticipants}
                onChange={(e) => setGameConfig(prev => ({
                  ...prev,
                  maxParticipants: parseInt(e.target.value)
                }))}
                className="w-full bg-transparent border border-gray-600 p-3 rounded"
              />
            </div>
            <button
              onClick={updateGameConfig}
              disabled={loading}
              className="w-full bg-[var(--color-primary)] text-background font-bold py-3 rounded-xl uppercase hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              Update Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}