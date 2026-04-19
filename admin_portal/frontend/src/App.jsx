import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Layout from './pages/Layout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import WorkersPage from './pages/WorkersPage';
import BookingsPage from './pages/BookingsPage';
import GrievancesPage from './pages/GrievancesPage';

function Protected({ children }) {
  return localStorage.getItem('admin_token') ? children : <Navigate to="/login" replace />;
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
