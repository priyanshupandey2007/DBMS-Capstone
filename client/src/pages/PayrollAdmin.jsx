import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Banknote,
  Calculator,
  Printer,
  Play,
  CheckCircle,
  Clock,
  Edit,
  X,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import SalarySlipModal from '../components/SalarySlipModal';

export default function PayrollAdmin() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [payrollData, setPayrollData] = useState([]);
  const [totals, setTotals] = useState({ totalGross: 0, totalDeductions: 0, totalNet: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Slip modal
  const [activeSlipId, setActiveSlipId] = useState(null);

  // Live Calculator Drawer
  const [showCalculator, setShowCalculator] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [calcForm, setCalcForm] = useState({
    employee_id: '',
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    allowances: '',
    deductions: ''
  });
  const [previewResult, setPreviewResult] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Edit Payroll Modal
  const [editSlip, setEditSlip] = useState(null);
  const [editForm, setEditForm] = useState({ allowances: '', deductions: '', payment_status: 'Pending' });

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await api.getPayroll({ month: selectedMonth, year: selectedYear });
      if (res.success) {
        setPayrollData(res.data);
        setTotals(res.totals || { totalGross: 0, totalDeductions: 0, totalNet: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.getEmployees({ status: 'Active' });
      if (res.success) {
        setEmployees(res.data);
        if (res.data.length > 0 && !calcForm.employee_id) {
          setCalcForm(prev => ({ ...prev, employee_id: res.data[0].employee_id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth, selectedYear]);

  // Batch Generate via Stored Procedure
  const handleBatchGenerate = async () => {
    const confirmMsg = `Execute Stored Procedure sp_calculate_monthly_payroll for ${selectedMonth}/${selectedYear}?\n\nThis will compute working days (fn_working_days), present units (fn_total_present_days), and net salary for all active employees.`;
    if (!window.confirm(confirmMsg)) return;

    setGenerating(true);
    setActionMsg('');
    try {
      const res = await api.generatePayroll(selectedMonth, selectedYear);
      setActionMsg(res.message);
      fetchPayroll();
    } catch (err) {
      alert('Batch generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Run Calculator Preview
  const runCalculatorPreview = async (empId, month, year, allow, deduct) => {
    if (!empId) return;
    setLoadingPreview(true);
    try {
      const res = await api.getPayrollPreview({
        employee_id: empId,
        month,
        year,
        ...(allow !== '' ? { allowances: allow } : {}),
        ...(deduct !== '' ? { deductions: deduct } : {})
      });
      if (res.success) {
        setPreviewResult(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (showCalculator && calcForm.employee_id) {
      runCalculatorPreview(calcForm.employee_id, calcForm.month, calcForm.year, calcForm.allowances, calcForm.deductions);
    }
  }, [calcForm, showCalculator]);

  // Mark as Paid
  const handleMarkPaid = async (payrollId) => {
    try {
      await api.markAsPaid(payrollId);
      fetchPayroll();
    } catch (err) {
      alert('Failed to mark payment: ' + err.message);
    }
  };

  // Open Edit
  const handleOpenEdit = (rec) => {
    setEditSlip(rec);
    setEditForm({
      allowances: rec.allowances,
      deductions: rec.deductions,
      payment_status: rec.payment_status
    });
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updatePayroll(editSlip.payroll_id, editForm);
      setEditSlip(null);
      fetchPayroll();
    } catch (err) {
      alert('Update failed: ' + err.message);
    }
  };

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Payroll & Salary Slips</h1>
          <p className="text-xs text-slate-500 mt-1">
            Batch-calculated using Stored Procedure <code className="font-mono text-brand-800">sp_calculate_monthly_payroll</code> and SQL Function <code className="font-mono text-brand-800">fn_net_salary</code>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Calculator Button */}
          <button
            onClick={() => setShowCalculator(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            <Calculator className="w-4 h-4 text-brand-800" />
            <span>Live Calculator Preview</span>
          </button>

          {/* Stored Procedure Execution Button */}
          <button
            onClick={handleBatchGenerate}
            disabled={generating}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-75"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Executing sp_calculate_monthly_payroll...' : 'Run Monthly Batch Payroll'}</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Period Selector & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Month/Year Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-xs font-semibold text-slate-700">Payroll Period</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="p-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{monthNames[m]}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="p-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-700 font-mono"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="text-[11px] text-slate-400">
            {payrollData.length} records generated
          </div>
        </div>

        {/* Total Gross */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Gross Pay</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2">
            ₹{totals.totalGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Basic Base + Allowances</p>
        </div>

        {/* Total Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Deductions</span>
          <div className="text-xl font-bold font-mono text-red-600 mt-2">
            ₹{totals.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">PF + Taxes & Absences</p>
        </div>

        {/* Total Net Payable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-white to-blue-50/50">
          <span className="text-xs font-semibold text-brand-900 uppercase">Net Salary Disbursed</span>
          <div className="text-xl font-bold font-mono text-brand-800 mt-2">
            ₹{totals.totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Formula: Gross - Deductions</p>
        </div>

      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Basic Pay</th>
                <th className="py-3 px-4">Allowances</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Net Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">Loading payroll ledger...</td>
                </tr>
              ) : payrollData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No payroll generated for {monthNames[selectedMonth]} {selectedYear}. Click "Run Monthly Batch Payroll" above!
                  </td>
                </tr>
              ) : (
                payrollData.map((rec) => (
                  <tr key={rec.payroll_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {rec.employee_name}
                      <div className="text-[10px] font-mono text-slate-400">EMP-{String(rec.employee_id).padStart(4, '0')}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{rec.designation}</div>
                      <div className="text-[11px] text-slate-500">{rec.department_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">₹{parseFloat(rec.basic_salary).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-emerald-600">+₹{parseFloat(rec.allowances).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-red-600">-₹{parseFloat(rec.deductions).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-brand-800">{rec.present_days}</span>
                      <span className="text-slate-400"> / {rec.working_days} d</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      ₹{parseFloat(rec.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        rec.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {rec.payment_status === 'Pending' && (
                        <button
                          onClick={() => handleMarkPaid(rec.payroll_id)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded transition"
                          title="Mark payment disbursed"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(rec)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                        title="Edit Allowances / Deductions"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setActiveSlipId(rec.payroll_id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-brand-800 hover:bg-brand-900 text-white rounded text-[11px] font-medium transition shadow-sm"
                        title="View & Print Official Payslip"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LIVE CALCULATOR PREVIEW DRAWER */}
      {showCalculator && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-brand-800" />
                <h2 className="text-base font-bold text-slate-900">Live Payroll Calculator Preview</h2>
              </div>
              <button onClick={() => setShowCalculator(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Evaluates MySQL functions <code className="font-mono font-semibold">fn_working_days()</code>, <code className="font-mono font-semibold">fn_total_present_days()</code>, and <code className="font-mono font-semibold">fn_net_salary()</code> live.
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Select Employee</label>
                <select
                  value={calcForm.employee_id}
                  onChange={(e) => setCalcForm({ ...calcForm, employee_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {employees.map(e => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.employee_name} — Base ₹{parseFloat(e.basic_salary).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Month</label>
                <select
                  value={calcForm.month}
                  onChange={(e) => setCalcForm({ ...calcForm, month: parseInt(e.target.value, 10) })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{monthNames[m]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Custom Allowances (₹)</label>
                <input
                  type="number"
                  placeholder="Defaults to 10%"
                  value={calcForm.allowances}
                  onChange={(e) => setCalcForm({ ...calcForm, allowances: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Custom Deductions (₹)</label>
                <input
                  type="number"
                  placeholder="Defaults to 5%"
                  value={calcForm.deductions}
                  onChange={(e) => setCalcForm({ ...calcForm, deductions: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Live Calculation Output Card */}
            {previewResult && (
              <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold text-slate-900">
                  <span>Candidate: {previewResult.employee_name}</span>
                  <span className="font-mono text-brand-800">{monthNames[previewResult.month]} {previewResult.year}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Basic Base Pay:</div>
                  <div className="text-right font-mono font-semibold">₹{previewResult.basic_salary.toLocaleString('en-IN')}</div>

                  <div>Eligible Working Days (excl. Sun):</div>
                  <div className="text-right font-mono">{previewResult.working_days} Days</div>

                  <div>Effective Present Days:</div>
                  <div className="text-right font-mono font-semibold text-brand-800">{previewResult.present_days} Days</div>

                  <div>Prorated Basic:</div>
                  <div className="text-right font-mono">₹{previewResult.prorated_basic.toLocaleString('en-IN')}</div>

                  <div>Allowances (HRA / DA):</div>
                  <div className="text-right font-mono text-emerald-600">+₹{previewResult.allowances.toLocaleString('en-IN')}</div>

                  <div>Gross Pay:</div>
                  <div className="text-right font-mono font-bold text-slate-900">₹{previewResult.gross_salary.toLocaleString('en-IN')}</div>

                  <div>Deductions (PF / Taxes):</div>
                  <div className="text-right font-mono text-red-600">-₹{previewResult.deductions.toLocaleString('en-IN')}</div>
                </div>

                <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Calculated Net Salary:</span>
                  <span className="text-lg font-bold font-mono text-brand-900">
                    ₹{previewResult.net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowCalculator(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs rounded-lg font-medium"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SLIP MODAL */}
      {editSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Edit Allowances & Deductions</h2>
              <button onClick={() => setEditSlip(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Employee:</span>
                <span className="font-bold text-slate-900 ml-2">{editSlip.employee_name}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Allowances (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.allowances}
                  onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deductions (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editForm.deductions}
                  onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={editForm.payment_status}
                  onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditSlip(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-semibold transition"
                >
                  Save & Recompute Net
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

