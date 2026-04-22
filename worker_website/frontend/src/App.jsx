import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Moon, Sun, Languages } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import TermsPage from './pages/TermsPage';
import SuccessPage from './pages/SuccessPage';
import DashboardPage from './pages/DashboardPage';
import { useTheme } from './context/ThemeContext';

function FloatingSettings() {
  const { isDark, setIsDark, lang, setLang } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className={`rounded-2xl shadow-2xl border p-4 w-52 space-y-3 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
          >
            <Languages className="w-4 h-4 text-emerald-500" />
            {lang === 'ml' ? 'Switch to English' : 'Switch to മലയാളം'}
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all active:scale-95"
        aria-label="Settings"
      >
        {open ? <span className="text-lg">×</span> : <span className="text-lg">⚙</span>}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
      <FloatingSettings />
    </>
  );
}
