import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import WorkerDetailPage from './pages/WorkerDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import GrievancePage from './pages/GrievancePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workers/:id" element={<WorkerDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/workers/:id/book"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grievances"
            element={
              <ProtectedRoute>
                <GrievancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-xl font-extrabold text-brand-600">HAYAKU</span>
            <p className="mt-2 text-sm text-slate-500">
              Trusted, verified local workers across Kerala — booked in minutes.
            </p>
          </div>
          <FooterCol title="Services" items={['Plumber', 'Electrician', 'Cleaner', 'Carpenter']} />
          <FooterCol title="Company" items={['About', 'How it works', 'Careers', 'Contact']} />
          <FooterCol title="Support" items={['Help centre', 'Raise a complaint', 'Terms', 'Privacy']} />
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} HAYAKU. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-ink">{title}</h4>
      <ul className="space-y-2 text-sm text-slate-500">
        {items.map((i) => (
          <li key={i} className="cursor-pointer transition hover:text-brand-600">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
