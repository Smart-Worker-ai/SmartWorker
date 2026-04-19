import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, HardHat, BookOpen, CheckCircle, AlertTriangle, MapPin, Trophy } from 'lucide-react';
import api from '../api';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-3xl font-black text-white">{value ?? '—'}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  const cards = [
    { icon: Users,         label: 'Total Customers',   value: stats?.totalCustomers,  color: 'bg-indigo-600', delay: 0 },
    { icon: HardHat,       label: 'Total Workers',     value: stats?.totalWorkers,    color: 'bg-emerald-600', delay: 0.05 },
    { icon: BookOpen,      label: 'Total Bookings',    value: stats?.totalBookings,   color: 'bg-amber-600', delay: 0.1 },
    { icon: CheckCircle,   label: 'Completed Jobs',    value: stats?.completedJobs,   color: 'bg-green-600', delay: 0.15 },
    { icon: AlertTriangle, label: 'Open Grievances',   value: stats?.openGrievances,  color: 'bg-red-600', delay: 0.2 },
    { icon: MapPin,        label: 'Total Grievances',  value: stats?.totalGrievances, color: 'bg-purple-600', delay: 0.25 },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Smart Workers analytics overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Services bar chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="font-bold text-white mb-5">Most Booked Services</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.topServices ?? []}>
              <XAxis dataKey="job_type" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Hot locations pie chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="font-bold text-white mb-5">Hot Locations</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats?.hotLocations ?? []} dataKey="count" nameKey="district" cx="50%" cy="50%" outerRadius={80} label={({ district }) => district}>
                {(stats?.hotLocations ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-white">Top Customers</h3>
          </div>
          <div className="space-y-3">
            {(stats?.topCustomers ?? []).slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 truncate">{c.email || c.phone || ''}</p>
                </div>
                <span className="text-sm font-bold text-indigo-400">{c.bookingCount} bookings</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Workers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white">Top Workers</h3>
          </div>
          <div className="space-y-3">
            {(stats?.topWorkers ?? []).slice(0, 5).map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.job_type} · {w.district}</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">{w.bookingCount} jobs</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
