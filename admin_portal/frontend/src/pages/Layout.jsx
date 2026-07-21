import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import {
  LayoutDashboard, Users, HardHat, BookOpen, MessageSquareWarning,
  LogOut, Wrench, Menu, X, ChevronRight, Moon, Sun, Languages, Bell,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import NotificationsPanel, { useNotificationsBadge } from './NotificationsPanel';

const NAV = [
  { to: '/',           icon: LayoutDashboard,      label: 'Dashboard',  mlLabel: 'ഡാഷ്‌ബോർഡ്',  color: 'from-brand-500 to-brand-600' },
  { to: '/customers',  icon: Users,                label: 'Customers',  mlLabel: 'ഉപഭോക്താക്കൾ', color: 'from-brand-400 to-brand-500' },
  { to: '/workers',    icon: HardHat,              label: 'Workers',    mlLabel: 'തൊഴിലാളികൾ',  color: 'from-brand-600 to-brand-700' },
  { to: '/bookings',   icon: BookOpen,             label: 'Bookings',   mlLabel: 'ബുക്കിംഗ്',    color: 'from-brand-500 to-brand-600' },
  { to: '/grievances', icon: MessageSquareWarning, label: 'Grievances', mlLabel: 'പരാതികൾ',     color: 'from-brand-600 to-brand-700' },
];

function NavItem({ to, icon: Icon, label, mlLabel, color, onClick }) {
  const { lang } = useTheme();
  const displayLabel = lang === 'ml' ? mlLabel : label;
  return (
    <NavLink to={to} end={to === '/'} onClick={onClick}>
      {({ isActive }) => (
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer select-none
            ${isActive
              ? 'text-white bg-white/5'
              : 'text-gray-400 dark:text-gray-400 hover:text-white hover:bg-gray-800/70'
            }`}
        >
          {isActive && (
            <motion.div
              layoutId="navIndicator"
              className={`absolute inset-0 bg-gradient-to-r ${color} rounded-xl opacity-15`}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
            />
          )}
          {isActive && (
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b ${color} rounded-r-full`} />
          )}
          <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
            ${isActive ? `bg-gradient-to-br ${color} shadow-md` : 'bg-gray-800 group-hover:bg-gray-700'}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="relative flex-1">{displayLabel}</span>
          {isActive && <ChevronRight className="relative w-3.5 h-3.5 opacity-40" />}
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
    <aside className="w-64 shrink-0 bg-gray-950 border-r border-gray-800/50 flex flex-col h-full">
      {/* Logo + notification bell */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800/50 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-black text-sm text-white">Crewzo</div>
          <div className="text-xs text-gray-500">Admin Portal v1.0</div>
        </div>
        {/* Desktop notification bell */}
        {onBell && (
          <button
            id="notifications-bell-desktop"
            onClick={onBell}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Activity Feed"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand-600 text-white text-xs rounded-full flex items-center justify-center font-bold px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* Theme + Language controls */}
      <div className="px-3 pb-2 border-t border-gray-800/50 pt-3 space-y-1">
        <button
          onClick={() => setIsDark(!isDark)}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/70 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          <div className={`ml-auto w-9 h-5 rounded-full transition-colors ${isDark ? 'bg-indigo-600' : 'bg-gray-700'} relative`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>
        <button
          onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/70 transition-colors"
        >
          <Languages className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ml' ? 'Switch to English' : 'മലയാളം'}</span>
        </button>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800/50 shrink-0">
        <motion.button
          onClick={logout}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-400 hover:bg-red-950/50 transition-colors duration-150"
        >
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </div>
          {lang === 'ml' ? 'ലോഗൗട്ട്' : 'Logout'}
        </motion.button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const { isDark } = useTheme();
  const { unread, clearBadge } = useNotificationsBadge();

  const openNotif = () => {
    clearBadge();
    setNotifOpen(true);
  };

  return (
    <div className={`flex h-screen text-white overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-gray-100'}`}>
      {/* Notifications panel (portal-level drawer) */}
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      {/* Desktop sidebar — always dark */}
      <div className="hidden md:flex h-full">
        <Sidebar onBell={openNotif} unreadCount={unread} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 flex"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="relative z-10 flex h-full"
            >
              <Sidebar onClose={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {/* Mobile top bar */}
        <header className={`md:hidden h-14 backdrop-blur-sm border-b flex items-center px-4 gap-3 shrink-0 ${isDark ? 'bg-gray-900/80 border-gray-800/50' : 'bg-white/90 border-gray-200'}`}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >
            <Menu className="w-4 h-4" />
          </motion.button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Crewzo Admin</span>
          </div>
          {/* Notifications bell — mobile */}
          <div className="ml-auto">
            <button
              id="notifications-bell-mobile"
              onClick={openNotif}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
