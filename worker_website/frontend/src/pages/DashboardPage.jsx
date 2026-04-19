import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Star, MapPin, Briefcase, Clock, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }[worker?.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 h-14 flex items-center justify-between">
        <span className="font-black text-brand-900">Smart Workers</span>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex gap-5 items-center">
          {worker?.profile_photo ? (
            <img src={worker.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-brand-100" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="w-8 h-8 text-brand-600" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900">{worker?.name}</h2>
            <p className="text-gray-500 text-sm">{worker?.job_type} · ₹{worker?.daily_rate}/day</p>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-2 ${statusColor}`}>
              {worker?.status?.toUpperCase()}
            </span>
          </div>
        </motion.div>

        {worker?.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex gap-3">
            <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Verification Pending</p>
              <p className="text-sm text-yellow-700 mt-1">Our team is reviewing your documents. You'll be notified once verified (24–48 hours).</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Star, label: 'Rating', value: worker?.total_reviews > 0 ? `${worker.rating}★` : 'New' },
            { icon: Briefcase, label: 'Reviews', value: worker?.total_reviews ?? 0 },
            { icon: MapPin, label: 'District', value: worker?.district },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <Icon className="w-5 h-5 text-brand-500 mx-auto mb-1" />
              <div className="font-black text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 mb-4">Profile Details</h3>
          {[
            ['Mobile', worker?.mobile],
            ['Current Location', worker?.current_location],
            ['Interested Locations', worker?.interested_locations],
            ['Experience', `${worker?.experience_years} year(s)`],
            ['Facilities Requested', worker?.facilities_requested || 'None'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2">
              <span className="text-gray-400">{k}</span>
              <span className="font-semibold text-gray-800 text-right max-w-[60%]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
