import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  CalendarCheck,
  Calendar,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Search
} from 'lucide-react';

export default function AttendanceAdmin() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDept, setSelectedDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mark Modal
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().slice(0, 10),
    check_in: '09:00',
    check_out: '18:00',
    status: 'Present'
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = { date: selectedDate };
      if (selectedDept) params.department_id = selectedDept;
      if (statusFilter) params.status = statusFilter;

      const res = await api.getAttendance(params);
      if (res.success) {
        setAttendance(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.getDepartments(),
        api.getEmployees({ status: 'Active' })
      ]);
      if (deptRes.success) setDepartments(deptRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedDept, statusFilter]);

  const handleOpenMark = (record = null) => {
    if (record) {
      setModalForm({
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        check_in: record.check_in || '09:00',
        check_out: record.check_out || '18:00',
        status: record.status
      });
    } else {
      setModalForm({
        employee_id: employees[0]?.employee_id || '',
        attendance_date: selectedDate,
        check_in: '09:00',
        check_out: '18:00',
        status: 'Present'
      });
    }
    setModalError('');
    setShowMarkModal(true);
  };

  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      await api.markAttendance({
        employee_id: parseInt(modalForm.employee_id, 10),
        attendance_date: modalForm.attendance_date,
        check_in: modalForm.status === 'Absent' ? null : modalForm.check_in,
        check_out: modalForm.status === 'Absent' ? null : modalForm.check_out,
        status: modalForm.status
      });
      setShowMarkModal(false);
      fetchAttendance();
    } catch (err) {
      setModalError(err.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforced by MySQL Trigger <code className="font-mono text-brand-800">trg_attendance_before_insert</code> (blocks future dates, inactive staff, and invalid checkouts).
          </p>
        </div>
        <button
          onClick={() => handleOpenMark()}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Mark / Override Swipe</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-700">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 font-mono"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700"
          >
            <option value="">All Statuses</option>
            <option value="Present">Present (1.0)</option>
            <option value="Late">Late (1.0)</option>
            <option value="Half Day">Half Day (0.5)</option>
            <option value="Absent">Absent (0.0)</option>
          </select>
        </div>

        {/* Viva Rule Callout */}
        <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          📐 <strong>Weightage:</strong> Present = 1.0 &bull; Late = 1.0 &bull; Half Day = 0.5 &bull; Absent = 0.0
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Credit Units</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading attendance data...</td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No attendance records found for {selectedDate}.
                  </td>
                </tr>
              ) : (
                attendance.map((rec) => {
                  const credit = rec.status === 'Present' || rec.status === 'Late' ? '1.0' : rec.status === 'Half Day' ? '0.5' : '0.0';
                  return (
                    <tr key={rec.attendance_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        EMP-{String(rec.employee_id).padStart(4, '0')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{rec.employee_name}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.department_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{rec.check_in || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{rec.check_out || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          rec.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'Late'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.status === 'Half Day'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{credit} Day</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenMark(rec)}
                          className="px-2.5 py-1 text-[11px] font-medium text-brand-800 hover:bg-brand-50 rounded transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MARK / OVERRIDE MODAL */}
      {showMarkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Mark / Override Attendance</h2>
              <button onClick={() => setShowMarkModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                <strong>Database Error:</strong> {modalError}
              </div>
            )}

            <form onSubmit={handleMarkSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={modalForm.employee_id}
                  onChange={(e) => setModalForm({ ...modalForm, employee_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700"
                >
                  <option value="">Choose Employee</option>
                  {employees.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.employee_name} ({e.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={modalForm.attendance_date}
                  onChange={(e) => setModalForm({ ...modalForm, attendance_date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-brand-700"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * Future dates are blocked by database trigger <code className="font-mono">trg_attendance_before_insert</code>.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status (CHECK Constraint) *</label>
                <select
                  required
                  value={modalForm.status}
                  onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700"
                >
                  <option value="Present">Present (1.0 Unit)</option>
                  <option value="Late">Late (1.0 Unit)</option>
                  <option value="Half Day">Half Day (0.5 Unit)</option>
                  <option value="Absent">Absent (0.0 Unit)</option>
                </select>
              </div>

              {modalForm.status !== 'Absent' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Check In Time</label>
                    <input
                      type="time"
                      value={modalForm.check_in}
                      onChange={(e) => setModalForm({ ...modalForm, check_in: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Check Out Time</label>
                    <input
                      type="time"
                      value={modalForm.check_out}
                      onChange={(e) => setModalForm({ ...modalForm, check_out: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-semibold transition"
                >
                  {submitting ? 'Validating via Trigger...' : 'Save Swipe Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

