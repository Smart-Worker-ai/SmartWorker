import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import TermsPage from './pages/TermsPage';
import SuccessPage from './pages/SuccessPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
