import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, HardHat, BookOpen, MessageSquareWarning, LogOut, Wrench, Menu, X } from 'lucide-react';

const NAV = [
  { to: '/',           icon: LayoutDashboard,     label: 'Dashboard' },
  { to: '/customers',  icon: Users,               label: 'Customers' },
  { to: '/workers',    icon: HardHat,             label: 'Workers' },
  { to: '/bookings',   icon: BookOpen,            label: 'Bookings' },
  { to: '/grievances', icon: MessageSquareWarning, label: 'Grievances' },
];

function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('admin_token'); navigate('/login'); onClose?.(); };

  return (
    <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-800 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-black text-sm">Smart Workers</div>
          <div className="text-xs text-gray-400">Admin Portal</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
               ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }>
            <Icon className="w-4 h-4 shrink-0" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800 shrink-0">
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors text-gray-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Wrench className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">Smart Workers Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
