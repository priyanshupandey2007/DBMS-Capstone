import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  X,
  AlertCircle
} from 'lucide-react';

export default function LeaveAdmin() {
  const [leaves, setLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Action modal
  const [activeLeave, setActiveLeave] = useState(null);
  const [actionType, setActionType] = useState('Approved'); // 'Approved' or 'Rejected'
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.getLeaves(params);
      if (res.success) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const handleOpenAction = (leave, type) => {
    setActiveLeave(leave);
    setActionType(type);
    setComment(type === 'Approved' ? 'Approved by HR Administrator.' : 'Declined due to critical project deliverables.');
    setActionError('');
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setSubmitting(true);
    try {
      await api.updateLeaveStatus(activeLeave.leave_id, actionType, comment);
      setActiveLeave(null);
      fetchLeaves();
    } catch (err) {
      setActionError(err.message || 'Failed to update leave status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Approvals & Workflow</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforces date consistency (<code className="font-mono">end_date &gt;= start_date</code>) and blocks overlapping leave windows.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded-md transition ${!statusFilter ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1 rounded-md transition ${statusFilter === 'Pending' ? 'bg-white text-amber-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('Approved')}
            className={`px-3 py-1 rounded-md transition ${statusFilter === 'Approved' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('Rejected')}
            className={`px-3 py-1 rounded-md transition ${statusFilter === 'Rejected' ? 'bg-white text-red-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Leaves Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates & Duration</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Applied On</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading leave requests...</td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No leave requests found for the selected status filter.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.leave_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      LR-{String(leave.leave_id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{leave.employee_name}</div>
                      <div className="text-[11px] text-slate-500">{leave.department_name}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{leave.leave_type}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-700">{leave.start_date} to {leave.end_date}</div>
                      <div className="text-[11px] font-semibold text-brand-800 font-mono">
                        {leave.duration_days} {leave.duration_days === 1 ? 'Day' : 'Days'}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={leave.reason}>
                      {leave.reason || 'No description provided'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{leave.applied_date}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        leave.leave_status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : leave.leave_status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {leave.leave_status}
                      </span>
                      {leave.action_comment && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-[120px] truncate" title={leave.action_comment}>
                          "{leave.action_comment}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {leave.leave_status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleOpenAction(leave, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenAction(leave, 'Rejected')}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-semibold transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenAction(leave, leave.leave_status === 'Approved' ? 'Rejected' : 'Approved')}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded text-[11px] transition"
                        >
                          Modify
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVAL / REJECTION DIALOG */}
      {activeLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {actionType === 'Approved' ? 'Approve' : 'Reject'} Leave Request
              </h2>
              <button onClick={() => setActiveLeave(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {actionError}
              </div>
            )}

            <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div><strong>Applicant:</strong> {activeLeave.employee_name} ({activeLeave.department_name})</div>
              <div><strong>Leave Type:</strong> {activeLeave.leave_type}</div>
              <div><strong>Period:</strong> {activeLeave.start_date} to {activeLeave.end_date} ({activeLeave.duration_days} Days)</div>
              <div><strong>Reason:</strong> {activeLeave.reason}</div>
            </div>

            <form onSubmit={handleActionSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  HR Decision Remarks / Comment
                </label>
                <textarea
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                  placeholder="Enter comments for employee notification..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveLeave(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white rounded-lg font-semibold transition ${
                    actionType === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Updating Status...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

