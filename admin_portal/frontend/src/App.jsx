import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import api from './api';
import LoginPage from './pages/LoginPage';
import Layout from './pages/Layout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import WorkersPage from './pages/WorkersPage';
import BookingsPage from './pages/BookingsPage';
import GrievancesPage from './pages/GrievancesPage';

// ── Auth gate ────────────────────────────────────────────────────────────────
// We can't see the httpOnly admin_session cookie from JS, so the only
// reliable check is to ask the server. /api/auth/me returns 200 if the
// session is valid, 401 otherwise — the api interceptor handles redirect
// on 401, so here we just gate rendering on the loading + result state.
function Protected({ children }) {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    let alive = true;
    api.get('/auth/me')
      .then(() => alive && setState({ loading: false, ok: true }))
      .catch(() => alive && setState({ loading: false, ok: false }));
    return () => { alive = false; };
  }, []);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
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
        <Route path="customers" element={<CustomersPage />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="grievances" element={<GrievancesPage />} />
      </Route>
    </Routes>
  );
}
