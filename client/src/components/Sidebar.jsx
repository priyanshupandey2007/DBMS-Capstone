import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  Banknote,
  Building2,
  Database,
  UserCheck,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { isAdmin } = useAuth();

  const adminNav = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employee Records', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Approvals', icon: FileText },
    { id: 'payroll', label: 'Monthly Payroll', icon: Banknote },
    { id: 'reports', label: 'DBMS Viva Reports', icon: Database, badge: 'Viva Qs' }
  ];

  const employeeNav = [
    { id: 'portal', label: 'My Dashboard', icon: UserCheck },
    { id: 'my-attendance', label: 'My Attendance', icon: Calendar },
    { id: 'my-leaves', label: 'Apply Leave', icon: FileText },
    { id: 'my-slips', label: 'My Salary Slips', icon: CreditCard }
  ];

  const navItems = isAdmin ? adminNav : employeeNav;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 shadow-lg select-none">
      <div>
        {/* Navigation Section */}
        <div className="p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-3">
            {isAdmin ? 'HR & Administration' : 'Employee Self Service'}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-brand-800 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-800">
          <p className="font-semibold text-slate-200">DBMS Capstone 2026</p>
          <p className="text-[11px] text-slate-400 mt-0.5">3NF Schema &bull; MySQL 8 &bull; Express</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-700">
            <span>Server: <strong className="text-emerald-400 font-normal">Active (5000)</strong></span>
            <span>ACID Verified</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

