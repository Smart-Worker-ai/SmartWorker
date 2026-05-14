import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Star, MapPin, Briefcase, Clock, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isDark, t, tStatus } = useTheme();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('worker_token');

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    axios.get('/api/workers/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setWorker(r.data.worker))
      .catch(() => { localStorage.removeItem('worker_token'); navigate('/'); })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => { localStorage.removeItem('worker_token'); navigate('/'); };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="animate-spin w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  const statusColor = {
    pending:  isDark ? 'bg-yellow-900/40 text-yellow-300 ring-1 ring-yellow-800/60' : 'bg-yellow-100 text-yellow-800',
    approved: isDark ? 'bg-green-900/40 text-green-300 ring-1 ring-green-800/60'   : 'bg-green-100 text-green-800',
    rejected: isDark ? 'bg-red-900/40 text-red-300 ring-1 ring-red-800/60'         : 'bg-red-100 text-red-800',
  }[worker?.status] ?? (isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700');

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <nav className={`border-b px-6 h-14 flex items-center justify-between transition-colors duration-300
        ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <span className={`font-black ${isDark ? 'text-white' : 'text-brand-900'}`}>{t('Smart Workers')}</span>
        <button onClick={logout} className={`flex items-center gap-1.5 text-sm transition-colors
          ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
          <LogOut className="w-4 h-4" /> {t('Logout')}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 border shadow-sm flex gap-5 items-center transition-colors duration-300
            ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          {worker?.profile_photo ? (
            <img src={worker.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-brand-200" />
          ) : (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center
              ${isDark ? 'bg-gray-800' : 'bg-brand-100'}`}>
              <User className={`w-8 h-8 ${isDark ? 'text-brand-400' : 'text-brand-600'}`} />
            </div>
          )}
          <div className="flex-1">
            <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{worker?.name}</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t(worker?.job_type ?? '')} · ₹{worker?.daily_rate}{t('/day')}
            </p>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-2 ${statusColor}`}>
              {tStatus(worker?.status)}
            </span>
          </div>
        </motion.div>

        {worker?.status === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className={`border rounded-2xl p-5 flex gap-3 transition-colors duration-300
              ${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
            <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <div>
              <p className={`font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                {t('Verification Pending')}
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
                {t('Verification pending message')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Star,      label: t('Rating'),   value: worker?.total_reviews > 0 ? `${worker.rating}★` : t('New') },
            { icon: Briefcase, label: t('Reviews'),  value: worker?.total_reviews ?? 0 },
            { icon: MapPin,    label: t('District'), value: worker?.district },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className={`border rounded-xl p-4 text-center shadow-sm transition-colors duration-300
              ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <Icon className="w-5 h-5 text-brand-500 mx-auto mb-1" />
              <div className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className={`border rounded-2xl p-6 shadow-sm space-y-3 transition-colors duration-300
          ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('Profile Details')}</h3>
          {[
            [t('Mobile'),               worker?.mobile],
            [t('Email'),                worker?.email || t('— None specified —')],
            [t('Current Location'),     worker?.current_location],
            [t('Interested Locations'), worker?.interested_locations],
            [t('Experience'),           `${worker?.experience_years} ${t('year(s)')}`],
            [t('Facilities Requested'), worker?.facilities_requested || t('None')],
          ].map(([k, v]) => (
            <div key={k} className={`flex justify-between text-sm border-b pb-2
              ${isDark ? 'border-gray-800' : 'border-gray-50'}`}>
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{k}</span>
              <span className={`font-semibold text-right max-w-[60%] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
