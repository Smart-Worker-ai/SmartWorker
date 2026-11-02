import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import { LanguageModal } from './components/LanguageModal';
import HomePage from './pages/HomePage.jsx';
import BookWorkersPage from './pages/BookWorkersPage.jsx';
import BookingDetailsPage from './pages/BookingDetailsPage.jsx';

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-slate-800">
      <Navbar />
      <main className="w-full flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookWorkersPage />} />
              <Route path="/book/details" element={<BookingDetailsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <LanguageModal />
    </div>
  );
}
