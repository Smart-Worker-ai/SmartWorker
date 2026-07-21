import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Users, HardHat, BookOpen, CheckCircle, AlertTriangle, TrendingUp, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

const COLORS_LIGHT = ['#0891b2', '#06b6d4', '#22d3ee', '#a5f3fc', '#cffafe'];
const COLORS_DARK = ['#06b6d4', '#22d3ee', '#a5f3fc', '#cffafe', '#e0f2fe'];

function StatCard({ icon: Icon, label, value, color, delay }) {
  const { isDark } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-xl border-2 p-6 transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{value ?? '—'}</div>
      <div className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { isDark, t } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  const cards = [
    { icon: Users,         label: t('totalCustomers'),   value: stats?.totalCustomers,  color: 'bg-brand-600', delay: 0 },
    { icon: HardHat,       label: t('totalWorkers'),     value: stats?.totalWorkers,    color: 'bg-blue-500', delay: 0.05 },
    { icon: BookOpen,      label: t('totalBookings'),    value: stats?.totalBookings,   color: 'bg-amber-500', delay: 0.1 },
    { icon: CheckCircle,   label: t('completedJobs'),    value: stats?.completedJobs,   color: 'bg-green-500', delay: 0.15 },
    { icon: AlertTriangle, label: t('openGrievances'),   value: stats?.openGrievances,  color: 'bg-red-500', delay: 0.2 },
    { icon: TrendingUp,    label: t('totalGrievances'),  value: stats?.totalGrievances, color: 'bg-purple-500', delay: 0.25 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('dashboardTitle')}</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('analyticsOverview')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Charts row */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Bookings trend line chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`rounded-xl border-2 p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}
        >
          <h3 className={`font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('bookingsTrend')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats?.topServices ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="job_type" stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 8, color: isDark ? '#fff' : '#000' }} />
              <Line type="monotone" dataKey="count" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Services distribution bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className={`rounded-xl border-2 p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}
        >
          <h3 className={`font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('topServices')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.topServices ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="job_type" stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <Tooltip contentStyle={{ background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 8, color: isDark ? '#fff' : '#000' }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Leaderboards */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className={`rounded-xl border-2 p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}
        >
          <div className="flex items-center gap-2 mb-5">
            <Trophy className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('topCustomers')}</h3>
          </div>
          <div className="space-y-3">
            {(stats?.topCustomers ?? []).slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? isDark ? 'bg-gray-300 text-gray-700' : 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name || 'Unknown'}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{c.email || c.phone || ''}</p>
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>{c.bookingCount} {t('bookings')}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Workers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className={`rounded-xl border-2 p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}
        >
          <div className="flex items-center gap-2 mb-5">
            <Trophy className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('topWorkers')}</h3>
          </div>
          <div className="space-y-3">
            {(stats?.topWorkers ?? []).slice(0, 5).map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? isDark ? 'bg-gray-300 text-gray-700' : 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{w.name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{w.job_type} · {w.district}</p>
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{w.bookingCount} {t('jobs')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
