import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeList from './pages/EmployeeList';
import DepartmentsPage from './pages/DepartmentsPage';
import AttendanceAdmin from './pages/AttendanceAdmin';
import LeaveAdmin from './pages/LeaveAdmin';
import PayrollAdmin from './pages/PayrollAdmin';
import ReportsPage from './pages/ReportsPage';
import EmployeePortal from './pages/EmployeePortal';

function MainApp() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Loading TechNova Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    if (!isAdmin) {
      return <EmployeePortal activeTab={activeTab} setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard setActiveTab={setActiveTab} />;
      case 'employees':
        return <EmployeeList />;
      case 'departments':
        return <DepartmentsPage />;
      case 'attendance':
        return <AttendanceAdmin />;
      case 'leaves':
        return <LeaveAdmin />;
      case 'payroll':
        return <PayrollAdmin />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <AdminDashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
