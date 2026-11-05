import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, Users, HardHat, Receipt, FileBarChart, Settings, LogOut,
} from 'lucide-react';
import api from '../api.js';
import HyrakuWordmark from '../HyrakuWordmark.jsx';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/enquiries', icon: MessageSquare, label: 'Enquiries' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/crew', icon: HardHat, label: 'Crew' },
  { to: '/bookings', icon: Receipt, label: 'Bookings' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Letterpad' },
];

export default function Layout() {
  const navigate = useNavigate();
  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    navigate('/login');
  }
  return (
    <div className="min-h-screen bg-sky-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sky-100 bg-white md:flex md:flex-col">
        <div className="px-5 py-5">
          <HyrakuWordmark className="h-8 w-auto" />
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-sky-50 text-[#0091ea]' : 'text-slate-600 hover:bg-sky-50'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} className="m-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
          <LogOut size={18} /> Sign out
        </button>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sky-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="inline-flex items-center gap-2">
            <HyrakuWordmark className="h-6 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin</span>
          </span>
          <button type="button" onClick={logout} className="text-xs font-bold text-rose-600">Sign out</button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-sky-100 bg-white px-2 py-2 md:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${isActive ? 'bg-[#0091ea] text-white' : 'text-slate-600'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet /></main>
      </div>
    </div>
  );
}
