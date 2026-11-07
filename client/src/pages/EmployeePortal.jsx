import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UserCheck,
  CalendarCheck,
  FileText,
  CreditCard,
  Clock,
  Printer,
  Plus,
  CheckCircle,
  AlertCircle,
  X,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import SalarySlipModal from '../components/SalarySlipModal';

export default function EmployeePortal({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const today = new Date();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchMsg, setPunchMsg] = useState('');
  const [punchLoading, setPunchLoading] = useState(false);

  // Tab views within portal if navigated via sidebar
  // subTabs: 'overview', 'attendance', 'leaves', 'payroll'
  const subTab = activeTab === 'my-attendance' 
    ? 'attendance' 
    : activeTab === 'my-leaves' 
    ? 'leaves' 
    : activeTab === 'my-slips' 
    ? 'payroll' 
    : 'overview';

  // Apply Leave Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Casual Leave',
    start_date: today.toISOString().slice(0, 10),
    end_date: today.toISOString().slice(0, 10),
    reason: ''
  });
  const [leaveError, setLeaveError] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // My Attendance Month Selector
  const [attMonth, setAttMonth] = useState(today.getMonth() + 1);
  const [attYear, setAttYear] = useState(today.getFullYear());
  const [myAttendanceData, setMyAttendanceData] = useState([]);
  const [myAttendanceSummary, setMyAttendanceSummary] = useState(null);

  // My Leaves List
  const [myLeaves, setMyLeaves] = useState([]);

  // My Slips List
  const [mySlips, setMySlips] = useState([]);
  const [activeSlipId, setActiveSlipId] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployeeDashboard();
      if (res.success) {
        setDashboard(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      const res = await api.getMyAttendance({ month: attMonth, year: attYear });
      if (res.success) {
        setMyAttendanceData(res.data);
        setMyAttendanceSummary(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await api.getMyLeaves();
      if (res.success) setMyLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMySlips = async () => {
    try {
      const res = await api.getMyPayroll();
      if (res.success) setMySlips(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchMyLeaves();
    fetchMySlips();
  }, []);

  useEffect(() => {
    fetchMyAttendance();
  }, [attMonth, attYear]);

  // Handle Punch In
  const handlePunchIn = async () => {
    setPunchLoading(true);
    setPunchMsg('');
    try {
      const res = await api.checkIn();
      setPunchMsg(res.message);
      fetchDashboard();
      fetchMyAttendance();
    } catch (err) {
      setPunchMsg('Punch In Error: ' + err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  // Handle Punch Out
  const handlePunchOut = async () => {
    setPunchLoading(true);
    setPunchMsg('');
    try {
      const res = await api.checkOut();
      setPunchMsg(res.message);
      fetchDashboard();
      fetchMyAttendance();
    } catch (err) {
      setPunchMsg('Punch Out Error: ' + err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  // Handle Apply Leave
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveError('');
    setSubmittingLeave(true);
    try {
      await api.applyLeave(leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({
        leave_type: 'Casual Leave',
        start_date: today.toISOString().slice(0, 10),
        end_date: today.toISOString().slice(0, 10),
        reason: ''
      });
      fetchMyLeaves();
      fetchDashboard();
    } catch (err) {
      setLeaveError(err.message || 'Leave submission failed.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-sm">Loading employee portal...</div>;
  }

  const { profile, todayAttendance, monthlyAttendance, latestPayroll } = dashboard || {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Employee Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {profile?.employee_name?.charAt(0) || 'E'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">{profile?.employee_name}</h1>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {profile?.employment_status}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {profile?.designation} &bull; <strong className="text-brand-900">{profile?.department_name}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              EMP-{String(profile?.employee_id).padStart(4, '0')} &bull; Joined: {profile?.joining_date} &bull; Base: ₹{parseFloat(profile?.basic_salary || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Quick Punch In/Out Actions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <Clock className="w-4 h-4 text-brand-800" />
            <span>Today's Swipes:</span>
            {todayAttendance?.check_in ? (
              <span className="font-mono text-emerald-700">
                In: {todayAttendance.check_in} {todayAttendance.check_out ? `| Out: ${todayAttendance.check_out}` : ''}
              </span>
            ) : (
              <span className="text-amber-600">Not Marked</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePunchIn}
              disabled={punchLoading || !!todayAttendance?.check_in}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              {todayAttendance?.check_in ? 'Checked In ✓' : 'Punch In Now'}
            </button>
            <button
              onClick={handlePunchOut}
              disabled={punchLoading || !todayAttendance?.check_in || !!todayAttendance?.check_out}
              className="px-3 py-1.5 bg-brand-800 hover:bg-brand-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              {todayAttendance?.check_out ? 'Checked Out ✓' : 'Punch Out'}
            </button>
          </div>

          {punchMsg && (
            <span className="text-[11px] text-brand-800 font-medium text-center">{punchMsg}</span>
          )}
        </div>
      </div>

      {/* OVERVIEW SECTION (Displayed on 'overview' or default tab) */}
      {(subTab === 'overview' || subTab === 'attendance') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-brand-800" />
              <span>Attendance Review ({monthNames[attMonth]} {attYear})</span>
            </h2>
            <div className="flex items-center space-x-2">
              <select
                value={attMonth}
                onChange={(e) => setAttMonth(parseInt(e.target.value, 10))}
                className="p-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{monthNames[m]}</option>
                ))}
              </select>
              <select
                value={attYear}
                onChange={(e) => setAttYear(parseInt(e.target.value, 10))}
                className="p-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Effective Present Days</span>
              <div className="text-2xl font-bold font-mono text-brand-800 mt-2">
                {myAttendanceSummary?.effective_present_days || 0} Days
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Present(1) + Late(1) + Half(0.5)</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Present Days</span>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-2">
                {myAttendanceData.filter(d => d.status === 'Present').length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Full 1.0 Day Credit</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase">Late Swipes</span>
              <div className="text-2xl font-bold font-mono text-amber-700 mt-2">
                {myAttendanceData.filter(d => d.status === 'Late').length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Arrived post 09:30 AM</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-red-600 uppercase">Absences</span>
              <div className="text-2xl font-bold font-mono text-red-600 mt-2">
                {myAttendanceData.filter(d => d.status === 'Absent').length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">0.0 Credit Unit</p>
            </div>
          </div>

          {/* Daily Swipes Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Check In</th>
                    <th className="py-2.5 px-4">Check Out</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myAttendanceData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">
                        No swipes logged for {monthNames[attMonth]} {attYear}.
                      </td>
                    </tr>
                  ) : (
                    myAttendanceData.map((d) => (
                      <tr key={d.attendance_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{d.attendance_date}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{d.check_in || '—'}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{d.check_out || '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'Late'
                              ? 'bg-amber-100 text-amber-800'
                              : d.status === 'Half Day'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-800">
                          {d.status === 'Present' || d.status === 'Late' ? '1.0' : d.status === 'Half Day' ? '0.5' : '0.0'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEAVES SECTION (Displayed on 'overview' or 'leaves' tab) */}
      {(subTab === 'overview' || subTab === 'leaves') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-brand-800" />
              <span>Leave Applications</span>
            </h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Apply For Leave</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Leave Type</th>
                    <th className="py-2.5 px-4">Dates</th>
                    <th className="py-2.5 px-4">Duration</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4">Applied Date</th>
                    <th className="py-2.5 px-4">Status & Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myLeaves.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400">
                        You have not submitted any leave applications yet.
                      </td>
                    </tr>
                  ) : (
                    myLeaves.map((l) => (
                      <tr key={l.leave_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{l.leave_type}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{l.start_date} to {l.end_date}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-brand-800">{l.duration_days} Days</td>
                        <td className="py-2.5 px-4 max-w-xs truncate text-slate-600" title={l.reason}>
                          {l.reason || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{l.applied_date}</td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            l.leave_status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.leave_status === 'Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {l.leave_status}
                          </span>
                          {l.action_comment && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              "{l.action_comment}"
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAYROLL SECTION (Displayed on 'overview' or 'payroll' tab) */}
      {(subTab === 'overview' || subTab === 'payroll') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-brand-800" />
              <span>My Salary Slips & History</span>
            </h2>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Basic Pay</th>
                    <th className="py-2.5 px-4">Allowances</th>
                    <th className="py-2.5 px-4">Deductions</th>
                    <th className="py-2.5 px-4">Present Units</th>
                    <th className="py-2.5 px-4">Net Salary Disbursed</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mySlips.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-400">
                        No salary slips recorded for your profile yet.
                      </td>
                    </tr>
                  ) : (
                    mySlips.map((p) => (
                      <tr key={p.payroll_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {monthNames[p.month]} {p.year}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">₹{parseFloat(p.basic_salary).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-600">+₹{parseFloat(p.allowances).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 font-mono text-red-600">-₹{parseFloat(p.deductions).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-brand-800">{p.present_days} / {p.working_days} d</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 text-sm">
                          ₹{parseFloat(p.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.payment_status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => setActiveSlipId(p.payroll_id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-brand-800 hover:bg-brand-900 text-white rounded text-[11px] font-semibold transition shadow-sm"
                          >
                            <Printer className="w-3 h-3" />
                            <span>View & Print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* APPLY FOR LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Apply for Leave</h2>
              <button onClick={() => setShowLeaveModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {leaveError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                <strong>Validation Error:</strong> {leaveError}
              </div>
            )}

            <form onSubmit={handleLeaveSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  required
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick / Medical Leave</option>
                  <option value="Vacation Leave">Vacation / Annual Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows="3"
                  required
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Provide details for HR approval..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                🔒 Validated by MySQL: <code className="font-mono">end_date &gt;= start_date</code> &amp; overlapping active dates are blocked automatically.
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-semibold transition"
                >
                  {submittingLeave ? 'Validating Constraints...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY SLIP MODAL */}
      {activeSlipId && (
        <SalarySlipModal payrollId={activeSlipId} onClose={() => setActiveSlipId(null)} />
      )}

    </div>
  );
}

