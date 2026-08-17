import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, LogOut, MessageSquareWarning, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-brand-600">
          HAYAKU
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/bookings" className="navlink">
                <CalendarCheck size={16} /> <span className="hidden sm:inline">My Bookings</span>
              </Link>
              <Link to="/grievances" className="navlink">
                <MessageSquareWarning size={16} /> <span className="hidden sm:inline">Support</span>
              </Link>
              <Link to="/profile" className="navlink">
                <UserCircle2 size={16} /> <span className="hidden sm:inline">{user?.name || 'Profile'}</span>
              </Link>
              <button onClick={handleLogout} className="navlink text-rose-600">
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
