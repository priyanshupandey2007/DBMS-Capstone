import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Database,
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Play,
  HelpCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function ReportsPage() {
  const [reportsList, setReportsList] = useState([]);
  const [activeReportId, setActiveReportId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await api.getReportsList();
        if (res.success && res.reports.length > 0) {
          setReportsList(res.reports);
          setActiveReportId(res.reports[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const fetchActiveReport = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getReportData(id);
      if (res.success) {
        setReportData(res.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReportId) {
      fetchActiveReport(activeReportId);
    }
  }, [activeReportId]);

  const handleCopySql = () => {
    if (reportData?.sql) {
      navigator.clipboard.writeText(reportData.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-brand-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-brand-200 text-xs font-mono mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>College DBMS Viva Presentation Hub</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Academic SQL Query Explorer</h1>
            <p className="text-xs text-brand-100 mt-1 max-w-2xl leading-relaxed">
              Showcase real, working SQL constructs executed live on MySQL 8: Joins, Nested Subqueries, Correlated Subqueries, NOT EXISTS, Views, Aggregate Functions, and Triggers.
            </p>
          </div>
          <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-center">
            <span className="text-[11px] uppercase font-semibold text-brand-200 tracking-wider">Reports Ready</span>
            <div className="text-2xl font-bold font-mono mt-0.5">{reportsList.length} Queries</div>
          </div>
        </div>
      </div>

      {/* Main Layout: Reports Selector on Left / Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Report Navigation Menu */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">
            Select DBMS Concept
          </div>
          <div className="space-y-1">
            {reportsList.map((rep) => {
              const isSelected = rep.id === activeReportId;
              return (
                <button
                  key={rep.id}
                  onClick={() => setActiveReportId(rep.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition duration-150 flex flex-col ${
                    isSelected
                      ? 'bg-brand-50 border border-brand-200 text-brand-900 font-semibold shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span className="leading-snug">{rep.title}</span>
                  <span className={`text-[10px] mt-1 font-mono ${isSelected ? 'text-brand-700 font-medium' : 'text-slate-400'}`}>
                    {rep.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Query Details, Live SQL Box & Results */}
        <div className="lg:col-span-3 space-y-5">
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
              Executing SQL query on MySQL 8 server...
            </div>
          ) : reportData ? (
            <>
              {/* Concept & Viva Examiner Notes */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{reportData.title}</h2>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-800 border border-brand-200">
                      {reportData.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchActiveReport(activeReportId)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      <Play className="w-3 h-3 fill-current text-brand-800" />
                      <span>Re-Run Query</span>
                    </button>
                    <button
                      onClick={() => setShowSql(!showSql)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{showSql ? 'Hide SQL' : 'View SQL'}</span>
                      {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Viva Concept Card */}
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900 block mb-0.5 font-semibold">Viva Examination Note:</strong>
                    <span className="text-amber-950 leading-relaxed">{reportData.viva_concept}</span>
                  </div>
                </div>
              </div>

              {/* Collapsible SQL Code Block */}
              {showSql && (
                <div className="bg-slate-900 rounded-xl overflow-hidden shadow-md border border-slate-800 animate-fadeIn">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
                      <Code2 className="w-3.5 h-3.5 text-brand-400" />
                      <span>Executed Parameterized SQL Query</span>
                    </div>
                    <button
                      onClick={handleCopySql}
                      className="inline-flex items-center space-x-1 text-[11px] text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2 py-1 rounded transition font-mono"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed select-text">
                    {reportData.sql}
                  </pre>
                </div>
              )}

              {/* Result Set Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-slate-800">
                    Live Query Result Set
                  </span>
                  <span className="font-mono text-slate-500">
                    {reportData.count} {reportData.count === 1 ? 'row returned' : 'rows returned'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  {reportData.data.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">Query executed with 0 matching rows.</div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          {Object.keys(reportData.data[0]).map((col) => (
                            <th key={col} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                              {col.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.data.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            {Object.values(row).map((val, colIdx) => (
                              <td key={colIdx} className="py-2.5 px-3 font-mono text-slate-700">
                                {val === null || val === undefined ? (
                                  <span className="text-slate-400 italic">NULL</span>
                                ) : typeof val === 'number' ? (
                                  val.toLocaleString('en-IN')
                                ) : (
                                  String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

      </div>

    </div>
  );
}

