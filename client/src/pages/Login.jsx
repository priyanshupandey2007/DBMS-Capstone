import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Lock, User, AlertCircle, Building, Key } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-800 text-white shadow-xl mb-3 border border-brand-700/50">
            <Building className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TechNova Solutions</h1>
          <p className="text-xs text-brand-200 mt-1">Smart Employee Management System &bull; Payroll & Attendance</p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-brand-900/60 border border-brand-700/40 text-[11px] text-brand-300 font-mono">
            College DBMS Capstone 2026
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7 border border-slate-100">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Sign In to Workspace</h2>
            <p className="text-xs text-slate-500">Enter your organizational credentials to continue.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username / Employee ID</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or emp101"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-800 hover:bg-brand-900 text-white font-medium text-sm rounded-lg transition duration-150 shadow-md flex items-center justify-center space-x-2 disabled:opacity-70"
            >
              {loading ? (
                <span>Authenticating with MySQL...</span>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Sign In Securely</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Demo Credentials (Click to fill)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => autofill('admin', 'Admin@123')}
                className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left transition"
              >
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-blue-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>HR Admin</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 font-mono">admin / Admin@123</div>
              </button>

              <button
                type="button"
                onClick={() => autofill('emp101', 'Emp@123')}
                className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-left transition"
              >
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-900">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Employee</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 font-mono">emp101 / Emp@123</div>
              </button>
            </div>
          </div>

          {/* Viva DBMS Note */}
          <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 text-center">
            🔐 Passwords stored strictly as bcrypt hashes in MySQL <code className="font-mono text-slate-700">users</code> table.
          </div>

        </div>

      </div>
    </div>
  );
}

