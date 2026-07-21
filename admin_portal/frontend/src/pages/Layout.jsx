import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import {
  LayoutDashboard, Users, HardHat, BookOpen, AlertCircle,
  LogOut, Zap, Menu, X, Moon, Sun, Languages, Bell,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import NotificationsPanel, { useNotificationsBadge } from './NotificationsPanel';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', mlLabel: 'ഡാഷ്‌ബോർഡ്' },
  { to: '/customers', icon: Users, label: 'Customers', mlLabel: 'ഉപഭോക്താക്കൾ' },
  { to: '/workers', icon: HardHat, label: 'Workers', mlLabel: 'തൊഴിലാളികൾ' },
  { to: '/bookings', icon: BookOpen, label: 'Bookings', mlLabel: 'ബുക്കിംഗ്' },
  { to: '/grievances', icon: AlertCircle, label: 'Grievances', mlLabel: 'പരാതികൾ' },
];

function NavItem({ to, icon: Icon, label, mlLabel, onClick }) {
  const { lang, isDark } = useTheme();
  const displayLabel = lang === 'ml' ? mlLabel : label;
  return (
    <NavLink to={to} end={to === '/'} onClick={onClick}>
      {({ isActive }) => (
        <motion.div
          whileTap={{ scale: 0.95 }}
          className={`relative flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 cursor-pointer
            ${isActive
              ? isDark
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'bg-brand-50 text-brand-700'
              : isDark
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span>{displayLabel}</span>
        </motion.div>
      )}
    </NavLink>
  );
}

function Sidebar({ onClose, onBell, unreadCount = 0 }) {
  const navigate = useNavigate();
  const { isDark, setIsDark, lang, setLang } = useTheme();

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* noop */ }
    localStorage.removeItem('admin_token');
    navigate('/login', { replace: true });
    onClose?.();
  };

  return (
    <aside className={`w-72 shrink-0 border-r flex flex-col h-full transition-colors ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`h-20 flex items-center gap-3 px-6 border-b transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>SmartWorkers</div>
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Admin Portal</div>
        </div>
        {onClose && (
          <button onClick={onClose} className={`md:hidden rounded-lg p-1 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Notification Bell */}
      {onBell && (
        <div className={`px-6 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <button
            onClick={onBell}
            className={`relative w-full flex items-center justify-center py-2.5 rounded-lg font-medium text-sm transition-colors ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Bell className="w-4 h-4 mr-2" />
            Activity Feed
            {unreadCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* Settings */}
      <div className={`px-4 pb-4 space-y-2 border-t transition-colors ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setIsDark(!isDark)}
          className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <span className="flex items-center gap-2">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
        <button
          onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
          className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <span className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            {lang === 'ml' ? 'English' : 'മലയാളം'}
          </span>
        </button>
        <button
          onClick={logout}
          className={`flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-red-400 hover:bg-red-950/30' : 'text-red-600 hover:bg-red-50'}`}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isDark } = useTheme();
  const { unread, clearBadge } = useNotificationsBadge();

  const openNotif = () => {
    clearBadge();
    setNotifOpen(true);
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors ${isDark ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar onBell={openNotif} unreadCount={unread} />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 flex"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            >
              <Sidebar onClose={() => setSidebarOpen(false)} onBell={openNotif} unreadCount={unread} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {/* Top Bar */}
        <header className={`lg:hidden h-16 border-b flex items-center px-4 gap-3 shrink-0 transition-colors ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SmartWorkers Admin</div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <main className="p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
