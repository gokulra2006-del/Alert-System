import React, { useState } from 'react';

export default function LoginOverlay({ onLogin }: { onLogin: () => void }) {
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (regNo.length < 8) {
      setError('Invalid V-TOP Registration Number');
      return;
    }
    setLoading(true);
    setError('');
    // Simulate SSO network request
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0a0e1a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-gray-900/80 backdrop-blur-xl border border-gray-700 p-8 rounded-3xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl text-white">🛡️</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-white text-center mb-2">Campus Shield</h1>
        <p className="text-xs text-gray-500 text-center mb-8 uppercase tracking-widest font-bold">University SSO Gateway</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 ml-1">Registration Number</label>
            <input 
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. 21BCE1029"
              className="w-full bg-black/40 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:bg-gray-800/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 ml-1">V-TOP Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:bg-gray-800/50 transition-colors"
              required
            />
          </div>

          {error && <p className="text-red-400 text-xs font-bold text-center mt-2">{error}</p>}

          <button 
            type="submit"
            disabled={loading || !regNo || !password}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <span className="animate-spin">⏳</span> : 'Authenticate'}
          </button>
        </form>

        <p className="text-[10px] text-gray-600 text-center mt-6 leading-relaxed">
          Authorized personnel and registered students only. False reports will be tracked via IP and Registration Number.
        </p>
      </div>
    </div>
  );
}
