import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, HardHat, BookOpen, MessageSquareWarning,
  LogOut, Wrench, Menu, X, ChevronRight,
} from 'lucide-react';

const NAV = [
  { to: '/',           icon: LayoutDashboard,      label: 'Dashboard',   color: 'from-blue-500 to-indigo-600' },
  { to: '/customers',  icon: Users,                label: 'Customers',   color: 'from-emerald-500 to-teal-600' },
  { to: '/workers',    icon: HardHat,              label: 'Workers',     color: 'from-violet-500 to-purple-600' },
  { to: '/bookings',   icon: BookOpen,             label: 'Bookings',    color: 'from-amber-500 to-orange-600' },
  { to: '/grievances', icon: MessageSquareWarning, label: 'Grievances',  color: 'from-rose-500 to-pink-600' },
];

function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
    onClose?.();
  };

  return (
    <aside className="w-64 shrink-0 bg-gray-950 border-r border-gray-800/60 flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800/60 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Wrench className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-black text-sm text-white">Smart Workers</div>
          <div className="text-xs text-gray-500">Admin Portal v1.0</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, color }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);
          return (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}>
              <motion.div
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className={`absolute inset-0 bg-gradient-to-r ${color} rounded-xl opacity-20`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b ${color} rounded-r-full`} />
                )}
                <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${isActive ? `bg-gradient-to-br ${color} shadow-lg` : 'bg-gray-800'}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="relative flex-1">{label}</span>
                {isActive && (
                  <ChevronRight className="relative w-3.5 h-3.5 text-white/50" />
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800/60 shrink-0">
        <motion.button
          onClick={logout}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-950/60 hover:text-red-400 transition-all duration-200"
        >
          <div className="w-8 h-8 bg-gray-800 hover:bg-red-900/40 rounded-lg flex items-center justify-center transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          Logout
        </motion.button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar />
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
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800/60 flex items-center px-4 gap-3 shrink-0">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
          >
            <Menu className="w-4.5 h-4.5" />
          </motion.button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">Smart Workers Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
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
