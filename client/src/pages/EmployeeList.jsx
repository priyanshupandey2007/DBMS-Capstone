import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  History,
  ToggleLeft,
  ToggleRight,
  Filter,
  X,
  AlertTriangle,
  Building,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [currentEmp, setCurrentEmp] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Form state
  const initialForm = {
    employee_name: '',
    email: '',
    phone: '',
    address: '',
    gender: 'Male',
    date_of_birth: '1995-01-01',
    joining_date: new Date().toISOString().slice(0, 10),
    department_id: '',
    designation: '',
    basic_salary: '',
    username: '',
    password: 'Emp@123'
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedDept) params.department_id = selectedDept;
      if (statusFilter) params.status = statusFilter;

      const res = await api.getEmployees(params);
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.getDepartments();
      if (res.success) setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData(initialForm);
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setCurrentEmp(emp);
    setFormData({
      employee_name: emp.employee_name,
      email: emp.email,
      phone: emp.phone || '',
      address: emp.address || '',
      gender: emp.gender || 'Male',
      date_of_birth: emp.date_of_birth || '',
      joining_date: emp.joining_date || '',
      department_id: emp.department_id || '',
      designation: emp.designation,
      basic_salary: emp.basic_salary,
      employment_status: emp.employment_status
    });
    setFormError('');
    setShowEditModal(true);
  };

  // View Audit Trail
  const handleOpenAudit = async (emp) => {
    setCurrentEmp(emp);
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const res = await api.getSalaryAudit(emp.employee_id);
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        basic_salary: parseFloat(formData.basic_salary),
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null
      };
      await api.createEmployee(payload);
      setShowAddModal(false);
      fetchEmployees();
    } catch (err) {
      setFormError(err.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        basic_salary: parseFloat(formData.basic_salary),
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null
      };
      await api.updateEmployee(currentEmp.employee_id, payload);
      setShowEditModal(false);
      fetchEmployees();
    } catch (err) {
      setFormError(err.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete (Status Toggle)
  const handleToggleStatus = async (emp) => {
    const nextStatus = emp.employment_status === 'Active' ? 'Inactive' : 'Active';
    const confirmMsg = `Are you sure you want to mark ${emp.employee_name} as ${nextStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleEmployeeStatus(emp.employee_id, nextStatus);
      fetchEmployees();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Hard Delete (ON DELETE CASCADE)
  const handleDelete = async (emp) => {
    const warning = `WARNING: This action is permanent!\n\nDeleting ${emp.employee_name} (ID: ${emp.employee_id}) will trigger MySQL foreign key constraint ON DELETE CASCADE, permanently purging:\n- Attendance logs\n- Leave applications\n- Payroll records\n- User login account\n\nType OK to confirm deletion.`;
    if (window.confirm(warning)) {
      try {
        await api.deleteEmployee(emp.employee_id);
        fetchEmployees();
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete CRUD operations adhering to 3NF schema, check constraints, and cascade relationships.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-700"
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
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-700"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Employee Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Emp ID</th>
                <th className="py-3 px-4">Employee Details</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Basic Salary</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading employee roster...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No employees match your search criteria.</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      EMP-{String(emp.employee_id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{emp.employee_name}</div>
                      <div className="text-[11px] text-slate-500">{emp.email} &bull; {emp.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{emp.designation}</div>
                      <div className="text-[11px] text-slate-500">{emp.department_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      ₹{parseFloat(emp.basic_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {emp.joining_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        emp.employment_status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {emp.employment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {/* View Salary Audit */}
                      <button
                        onClick={() => handleOpenAudit(emp)}
                        title="View Database Trigger Salary Audit Log"
                        className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded transition"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Profile */}
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        title="Edit Employee & Salary"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Soft Delete Toggle */}
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        title={`Soft Delete: Toggle status to ${emp.employment_status === 'Active' ? 'Inactive' : 'Active'}`}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                      >
                        {emp.employment_status === 'Active' ? (
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      {/* Hard Delete with Cascade */}
                      <button
                        onClick={() => handleDelete(emp)}
                        title="Hard Delete (ON DELETE CASCADE)"
                        className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add New Employee Profile</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_name}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="rahul@technova.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="+91 98765 00000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender (CHECK)</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 bg-white"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Basic Salary (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="Defaults to email prefix"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Password (bcrypt)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700"
                    placeholder="Emp@123"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-semibold transition"
                >
                  {submitting ? 'Executing sp_add_employee...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {showEditModal && currentEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Edit Employee: {currentEmp.employee_name}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_name}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Salary Update Callout (Fires DB Trigger) */}
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                <label className="block font-semibold text-purple-900 mb-1">
                  Basic Salary (₹) – Triggers Audit Log
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                  className="w-full p-2 border border-purple-300 rounded-lg font-mono font-bold"
                />
                <p className="text-[10px] text-purple-700 mt-1">
                  ⚡ Updating this field fires MySQL Trigger: <code className="font-mono">trg_employees_after_salary_update</code>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-semibold transition"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY AUDIT TRAIL MODAL */}
      {showAuditModal && currentEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Salary Audit Trail: {currentEmp.employee_name}
                </h2>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Historical salary revisions automatically recorded in MySQL <code className="font-mono font-semibold">salary_audit</code> table via database AFTER UPDATE trigger.
            </div>

            <div className="mt-4 overflow-y-auto max-h-72">
              {loadingAudit ? (
                <div className="py-6 text-center text-slate-400 text-xs">Querying salary_audit table...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No previous salary revisions logged for this employee.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Revision Date</th>
                      <th className="py-2 px-3">Old Salary</th>
                      <th className="py-2 px-3">New Salary</th>
                      <th className="py-2 px-3">Hike</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => {
                      const hike = parseFloat(log.new_salary) - parseFloat(log.old_salary);
                      return (
                        <tr key={log.audit_id}>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{log.changed_at}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">₹{parseFloat(log.old_salary).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">₹{parseFloat(log.new_salary).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-emerald-600">
                            {hike >= 0 ? `+₹${hike.toLocaleString('en-IN')}` : `-₹${Math.abs(hike).toLocaleString('en-IN')}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

