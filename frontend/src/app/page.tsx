'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuth';
import { useRouter } from 'next/navigation';
import { AdminPanel } from '../components/AdminPanel';

export default function Home() {
  const { user, token, login, logout, initialize, isInitialized } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [wheels, setWheels] = useState<any[]>([]);
  const router = useRouter();

  const fetchWheels = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wheel/active`);
      const data = await res.json();
      setWheels(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized) {
      fetchWheels();
      const interval = setInterval(fetchWheels, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = isLogin ? { email, password } : { email, password, username };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWheel = async () => {
    if (!token) {
      alert('Please log in first');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wheel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ entryFee: 100 })
      });
      const data = await res.json();
      if (res.ok) {
        fetchWheels();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinWheel = async (wheelId: string) => {
    if (!token) {
      alert('Please log in first');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/wheel/${wheelId}/join`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/game/${wheelId}`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-orbitron text-[var(--color-primary)] font-bold">ROXSTAR</h1>
        {user ? (
          <div className="flex items-center gap-6 glass px-6 py-3 rounded-full">
            <span className="font-bold">{user.username}</span>
            <span className="text-[var(--color-secondary)] font-bold">{user.coinBalance} Coins</span>
            <button onClick={logout} className="text-sm text-red-400">Logout</button>
          </div>
        ) : null}
      </header>

      {!isInitialized ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl">Loading...</div>
        </div>
      ) : !user ? (
        <div className="max-w-md mx-auto glass p-8 rounded-2xl">
          <h2 className="text-2xl mb-6 font-orbitron">{isLogin ? 'Login' : 'Register'}</h2>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLogin && (
              <input 
                placeholder="Username" 
                className="bg-transparent border border-gray-600 p-3 rounded"
                value={username} onChange={e => setUsername(e.target.value)} required 
              />
            )}
            <input 
              type="email" placeholder="Email" 
              className="bg-transparent border border-gray-600 p-3 rounded"
              value={email} onChange={e => setEmail(e.target.value)} required 
            />
            <input 
              type="password" placeholder="Password" 
              className="bg-transparent border border-gray-600 p-3 rounded"
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
            <button type="submit" className="bg-[var(--color-primary)] text-background font-bold p-3 rounded uppercase mt-4">
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="mt-4 text-sm text-gray-400">
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </button>
        </div>
      ) : (
        <div>
          {user.role === 'ADMIN' && <AdminPanel />}
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-orbitron">Active Wheels</h2>
            {user.role === 'ADMIN' && (
              <button onClick={handleCreateWheel} className="bg-[var(--color-secondary)] text-background font-bold px-6 py-2 rounded-full shadow-[0_0_15px_var(--color-secondary)]">
                Create Wheel (100 Coins)
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wheels.map(wheel => (
              <div key={wheel.id} className="glass p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-secondary)] font-bold">{wheel.entryFee} Coins Entry</span>
                  <span className="text-xs uppercase bg-gray-800 px-2 py-1 rounded">{wheel.status}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Players Joined</p>
                  <p className="font-orbitron text-xl">{wheel.participants?.length || 0} / Unlimited</p>
                </div>
                <div className="mt-auto pt-4">
                  {wheel.status === 'WAITING' ? (
                    <button 
                      onClick={() => handleJoinWheel(wheel.id)}
                      className="w-full bg-[var(--color-primary)] text-background font-bold py-3 rounded-xl uppercase hover:scale-[1.02] transition-transform"
                    >
                      Join Game
                    </button>
                  ) : (
                    <button 
                      onClick={() => router.push(`/game/${wheel.id}`)}
                      className="w-full bg-gray-700 text-white font-bold py-3 rounded-xl uppercase hover:bg-gray-600 transition-colors"
                    >
                      Watch Game
                    </button>
                  )}
                </div>
              </div>
            ))}
            {wheels.length === 0 && (
              <p className="text-gray-400 col-span-full">No active wheels at the moment. Wait for an admin to create one!</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
