import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Printer, X, CheckCircle, Clock } from 'lucide-react';

export default function SalarySlipModal({ payrollId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSlip() {
      try {
        setLoading(true);
        const res = await api.getSalarySlip(payrollId);
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (payrollId) {
      loadSlip();
    }
  }, [payrollId]);

  const handlePrint = () => {
    window.print();
  };

  if (!payrollId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-fadeIn">
        
        {/* Modal Top Bar (Hidden during print) */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800 text-sm">Official Salary Slip Document</span>
            {data?.slip?.payment_status === 'Paid' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle className="w-3 h-3 mr-1" /> Paid
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <Clock className="w-3 h-3 mr-1" /> Pending
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-800 text-white rounded-lg text-xs font-medium hover:bg-brand-900 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content / Printable Area */}
        <div className="p-8" id="printable-slip">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">Generating salary slip document...</div>
          ) : error ? (
            <div className="py-12 text-center text-red-600 text-sm">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* Header */}
              <div className="border-b-2 border-brand-800 pb-4 text-center">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{data.company.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{data.company.address}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Email: {data.company.email} &bull; Tel: {data.company.phone}
                </p>
                <div className="mt-3 inline-block bg-brand-50 border border-brand-200 text-brand-900 font-bold px-4 py-1 rounded text-xs uppercase tracking-wide">
                  SALARY PAYSLIP &bull; {data.slip.month_name} {data.slip.year}
                </div>
              </div>

              {/* Employee & Payroll Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500 font-medium">Employee ID:</span>
                    <span className="col-span-2 font-mono font-semibold text-slate-800">EMP-{String(data.slip.employee_id).padStart(4, '0')}</span>
                    
                    <span className="text-slate-500 font-medium">Employee Name:</span>
                    <span className="col-span-2 font-semibold text-slate-900">{data.slip.employee_name}</span>
                    
                    <span className="text-slate-500 font-medium">Designation:</span>
                    <span className="col-span-2 text-slate-700">{data.slip.designation}</span>

                    <span className="text-slate-500 font-medium">Department:</span>
                    <span className="col-span-2 text-slate-700">{data.slip.department_name}</span>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500 font-medium">Joining Date:</span>
                    <span className="col-span-2 text-slate-700">{data.slip.joining_date}</span>
                    
                    <span className="text-slate-500 font-medium">Working Days:</span>
                    <span className="col-span-2 font-mono text-slate-700">{data.slip.working_days} Days (excl. Sundays)</span>

                    <span className="text-slate-500 font-medium">Present Units:</span>
                    <span className="col-span-2 font-mono font-semibold text-brand-800">{data.slip.present_days} Days</span>

                    <span className="text-slate-500 font-medium">Generated On:</span>
                    <span className="col-span-2 text-slate-500">{data.slip.generated_date}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold">
                      <th className="py-2.5 px-4 text-left border-r border-slate-300 w-1/2">EARNINGS</th>
                      <th className="py-2.5 px-4 text-right border-r border-slate-300 w-1/4">AMOUNT (₹)</th>
                      <th className="py-2.5 px-4 text-left border-r border-slate-300 w-1/2">DEDUCTIONS</th>
                      <th className="py-2.5 px-4 text-right w-1/4">AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2 px-4 border-r border-slate-300 text-slate-700">Basic Base Salary</td>
                      <td className="py-2 px-4 text-right border-r border-slate-300 font-mono">
                        {parseFloat(data.slip.basic_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-300 text-slate-700">Provident Fund (PF)</td>
                      <td className="py-2 px-4 text-right font-mono">
                        {(parseFloat(data.slip.deductions) * 0.6).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border-r border-slate-300 text-slate-700">Allowances (HRA / DA / Travel)</td>
                      <td className="py-2 px-4 text-right border-r border-slate-300 font-mono">
                        {parseFloat(data.slip.allowances).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-300 text-slate-700">Professional Tax / Other Deductions</td>
                      <td className="py-2 px-4 text-right font-mono">
                        {(parseFloat(data.slip.deductions) * 0.4).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-300">
                      <td className="py-2 px-4 border-r border-slate-300">Gross Earnings</td>
                      <td className="py-2 px-4 text-right border-r border-slate-300 font-mono text-emerald-700">
                        ₹{parseFloat(data.slip.gross_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-300">Total Deductions</td>
                      <td className="py-2 px-4 text-right font-mono text-red-700">
                        ₹{parseFloat(data.slip.deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Pay Callout */}
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-brand-900 tracking-wide">Net Salary Payable</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Formula: (Basic / Working Days × Present) + Allowances - Deductions</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-brand-900">
                    ₹{parseFloat(data.slip.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">Authorized Electronic Transfer</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between text-xs text-slate-500">
                <div className="text-center w-48">
                  <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-slate-700">TechNova HR Desk</div>
                  <span>Authorized HR Signatory</span>
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-slate-700">{data.slip.employee_name}</div>
                  <span>Employee Signature</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                * This document is generated electronically by TechNova Smart Employee Management System.
              </div>

            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}

