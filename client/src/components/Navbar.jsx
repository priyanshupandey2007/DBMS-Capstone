import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, RefreshCw, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResetDb = async () => {
    if (!window.confirm('Reset database to default sample records? This will re-seed all tables.')) {
      return;
    }
    setResetting(true);
    setResetMsg('');
    try {
      await api.setupDb();
      setResetMsg('Database reset successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20">
      {/* Brand & Organization Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-brand-800 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          TN
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            TechNova Solutions Pvt. Ltd.
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Smart Employee Management System &bull; Payroll & Attendance
          </p>
        </div>
      </div>

      {/* Center Digital Clock */}
      <div className="hidden md:flex items-center space-x-2 text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-brand-700" />
        <span>{currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span className="text-slate-400">|</span>
        <span className="font-semibold text-slate-900">{currentTime.toLocaleTimeString('en-IN')}</span>
      </div>

      {/* Right Controls: User pill, DB reset, Logout */}
      <div className="flex items-center space-x-3">
        {isAdmin && (
          <button
            onClick={handleResetDb}
            disabled={resetting}
            title="Reset DB with canonical test data for viva demo"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-md transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset Demo DB'}</span>
          </button>
        )}

        {resetMsg && (
          <span className="text-xs text-emerald-600 font-medium">{resetMsg}</span>
        )}

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-semibold text-sm">
            {user?.employee_name ? user.employee_name.charAt(0) : <User className="w-4 h-4" />}
          </div>
          <div className="text-left hidden lg:block">
            <div className="text-xs font-semibold text-slate-900 leading-none">
              {user?.employee_name || user?.username}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className={`inline-block px-1.5 py-0.2 rounded font-semibold uppercase ${
                isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user?.role}
              </span>
              <span className="ml-1 text-slate-400">({user?.designation || 'System'})</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

