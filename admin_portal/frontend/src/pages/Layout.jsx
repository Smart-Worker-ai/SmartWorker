import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, HardHat, BookOpen, MessageSquareWarning, LogOut, Wrench } from 'lucide-react';

const NAV = [
  { to: '/',           icon: LayoutDashboard,       label: 'Dashboard' },
  { to: '/customers',  icon: Users,                  label: 'Customers' },
  { to: '/workers',    icon: HardHat,                label: 'Workers' },
  { to: '/bookings',   icon: BookOpen,               label: 'Bookings' },
  { to: '/grievances', icon: MessageSquareWarning,   label: 'Grievances' },
];

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('admin_token'); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-black text-sm">Smart Workers</div>
            <div className="text-xs text-gray-400">Admin Portal</div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                 ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
              }>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
