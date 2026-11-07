/**
 * Centralized API Client
 * Wraps native fetch with auth headers, error propagation, and base URL routing.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('technova_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => request('/auth/me'),
  logout: () => {
    localStorage.removeItem('technova_token');
    localStorage.removeItem('technova_user');
    return request('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  // Dashboard
  getAdminDashboard: () => request('/dashboard/admin'),
  getEmployeeDashboard: () => request('/dashboard/employee'),

  // Employees
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/employees${query ? `?${query}` : ''}`);
  },
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleEmployeeStatus: (id, status) => request(`/employees/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  getSalaryAudit: (id) => request(`/employees/${id}/audit`),

  // Departments
  getDepartments: () => request('/departments'),
  createDepartment: (data) => request('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id, data) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance${query ? `?${query}` : ''}`);
  },
  getMyAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/my${query ? `?${query}` : ''}`);
  },
  markAttendance: (data) => request('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  checkIn: (data = {}) => request('/attendance/checkin', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (data = {}) => request('/attendance/checkout', { method: 'POST', body: JSON.stringify(data) }),

  // Leaves
  getLeaves: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/leaves${query ? `?${query}` : ''}`);
  },
  getMyLeaves: () => request('/leaves/my'),
  applyLeave: (data) => request('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id, status, comment) => 
    request(`/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, comment }) }),

  // Payroll
  getPayroll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payroll${query ? `?${query}` : ''}`);
  },
  getMyPayroll: () => request('/payroll/my'),
  getSalarySlip: (id) => request(`/payroll/${id}`),
  generatePayroll: (month, year) => request('/payroll/generate', { method: 'POST', body: JSON.stringify({ month, year }) }),
  getPayrollPreview: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payroll/calculator/preview?${query}`);
  },
  updatePayroll: (id, data) => request(`/payroll/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  markAsPaid: (id) => request(`/payroll/${id}/pay`, { method: 'PATCH' }),

  // Reports (DBMS Viva)
  getReportsList: () => request('/reports/list'),
  getReportData: (id) => request(`/reports/${id}`),

  // DB Setup
  setupDb: () => request('/setup-db', { method: 'POST' })
};

