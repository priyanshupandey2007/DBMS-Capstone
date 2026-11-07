import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Building2,
  Plus,
  Users,
  Edit2,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState({ department_name: '', description: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.getDepartments();
      if (res.success) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setForm({ department_name: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (dept) => {
    setIsEditing(true);
    setCurrentId(dept.department_id);
    setForm({ department_name: dept.department_name, description: dept.description || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.updateDepartment(currentId, form);
      } else {
        await api.createDepartment(form);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dept) => {
    if (dept.total_employees > 0) {
      alert(`Cannot delete ${dept.department_name} because ${dept.total_employees} employees are currently assigned to it. Foreign Key constraint requires reassignment first.`);
      return;
    }

    if (window.confirm(`Delete department ${dept.department_name}?`)) {
      try {
        await api.deleteDepartment(dept.department_id);
        fetchDepartments();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Department Architecture</h1>
          <p className="text-xs text-slate-500 mt-1">
            Separated into an independent entity table in 3NF to prevent transitive data redundancy.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Department</span>
        </button>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-slate-400 text-xs">Loading organizational units...</div>
        ) : (
          departments.map((dept) => (
            <div
              key={dept.department_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-800 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-400 hover:text-blue-700 rounded hover:bg-slate-50 transition"
                      title="Edit Department"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded hover:bg-slate-50 transition"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3">{dept.department_name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                  {dept.description || 'No departmental description provided.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Headcount:</span>
                  <strong className="text-slate-900 font-mono">{dept.total_employees}</strong>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {dept.active_employees} Active
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Department' : 'Create Department'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={form.department_name}
                  onChange={(e) => setForm({ ...form, department_name: e.target.value })}
                  placeholder="e.g. Quality Assurance & Testing"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Outline the operational responsibilities of this unit..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-semibold transition"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

