import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import api from './api.js';
import Layout from './pages/Layout.jsx';
import LoginPage, { LoginBackdrop } from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EnquiriesPage from './pages/EnquiriesPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import CrewPage from './pages/CrewPage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function Protected({ children }) {
  const [state, setState] = useState({ loading: true, ok: false });
  useEffect(() => {
    api.get('/auth/me').then(() => setState({ loading: false, ok: true })).catch(() => setState({ loading: false, ok: false }));
  }, []);
  if (state.loading) {
    return (
      <LoginBackdrop>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0091ea] border-t-transparent" />
      </LoginBackdrop>
    );
  }
  return state.ok ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="crew" element={<CrewPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
