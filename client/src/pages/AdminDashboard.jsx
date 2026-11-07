import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Users,
  CalendarCheck,
  FileText,
  Banknote,
  Building2,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-sm">Loading dashboard analytics...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm m-6">
        Error loading dashboard: {error}
      </div>
    );
  }

  const { metrics, deptDistribution, recentLeaves, recentPunches } = data || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive HR Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time metrics calculated dynamically via MySQL 8 queries, stored functions, and views.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('reports')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-50 text-brand-800 border border-brand-200 hover:bg-brand-100 rounded-lg text-xs font-semibold transition"
          >
            <span>Explore DBMS Lab Queries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Employees */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Headcount</span>
            <div className="p-2 bg-blue-50 text-brand-800 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics?.total_employees || 0}</span>
            <span className="text-xs text-emerald-600 font-medium">{metrics?.active_employees || 0} Active</span>
            <span className="text-xs text-slate-400">/ {metrics?.inactive_employees || 0} Inactive</span>
          </div>
          <button
            onClick={() => setActiveTab('employees')}
            className="mt-3 text-xs text-brand-800 hover:text-brand-900 font-medium inline-flex items-center space-x-1"
          >
            <span>Manage Employees</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance Today</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics?.present_today || 0}</span>
            <span className="text-xs text-slate-500">Logged Today</span>
          </div>
          <div className="mt-2 flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="text-amber-600 font-medium">{metrics?.late_today || 0} Late</span>
            <span>&bull;</span>
            <span className="text-blue-600 font-medium">{metrics?.half_day_today || 0} Half</span>
            <span>&bull;</span>
            <span className="text-red-600 font-medium">{metrics?.absent_today || 0} Absent</span>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Leaves</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700">{metrics?.pending_leaves || 0}</span>
            <span className="text-xs text-slate-500">Awaiting Action</span>
          </div>
          <button
            onClick={() => setActiveTab('leaves')}
            className="mt-3 text-xs text-amber-800 hover:text-amber-900 font-medium inline-flex items-center space-x-1"
          >
            <span>Review Applications</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Monthly Payroll Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Payroll ({metrics?.payroll_month}/{metrics?.payroll_year})
            </span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ₹{parseFloat(metrics?.monthly_payroll_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('payroll')}
            className="mt-3 text-xs text-purple-800 hover:text-purple-900 font-medium inline-flex items-center space-x-1"
          >
            <span>Payroll Calculator & Slips</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* Center Layout: Department Staffing & Today's Swipe Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Distribution (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-brand-800" />
              <span>Department Distribution</span>
            </h2>
            <button
              onClick={() => setActiveTab('departments')}
              className="text-xs text-brand-800 hover:underline font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {deptDistribution?.map((dept, idx) => {
              const maxCount = Math.max(...(deptDistribution.map(d => d.count)), 1);
              const percentage = Math.round((dept.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{dept.department_name}</span>
                    <span className="font-semibold text-slate-900 font-mono">{dept.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-800 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Leave Requests (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-brand-800" />
              <span>Recent Leave Requests</span>
            </h2>
            <button
              onClick={() => setActiveTab('leaves')}
              className="text-xs text-brand-800 hover:underline font-medium"
            >
              All Leaves
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Dates</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeaves?.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-slate-400">No recent leave requests.</td>
                  </tr>
                ) : (
                  recentLeaves?.map((leave) => (
                    <tr key={leave.leave_id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{leave.employee_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{leave.department_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{leave.leave_type}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{leave.start_date} – {leave.end_date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          leave.leave_status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : leave.leave_status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {leave.leave_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Today's Swipes Log */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-brand-800" />
            <span>Today's Swipes Activity</span>
          </h2>
          <button
            onClick={() => setActiveTab('attendance')}
            className="text-xs text-brand-800 hover:underline font-medium"
          >
            Open Attendance Manager
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2 px-3">Employee</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Check In</th>
                <th className="py-2 px-3">Check Out</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPunches?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-400">No punches logged for today yet.</td>
                </tr>
              ) : (
                recentPunches?.map((punch) => (
                  <tr key={punch.attendance_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{punch.employee_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{punch.department_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{punch.check_in || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{punch.check_out || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        punch.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : punch.status === 'Late'
                          ? 'bg-amber-100 text-amber-800'
                          : punch.status === 'Half Day'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {punch.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

