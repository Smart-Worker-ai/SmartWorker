import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import api from '../api';

const STATUS_COLORS = {
  pending:   'bg-yellow-900/40 text-yellow-400',
  confirmed: 'bg-blue-900/40 text-blue-400',
  completed: 'bg-green-900/40 text-green-400',
  cancelled: 'bg-red-900/40 text-red-400',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/bookings${params}`).then(r => setBookings(r.data.bookings ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); load(); }, [statusFilter]);

  const filtered = bookings.filter(b =>
    [b.worker_name, b.job_type, b.district, b.town].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-white mb-2">Bookings</h1>
      <p className="text-gray-400 text-sm mb-6">{bookings.length} bookings</p>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by worker, job type, location…"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                {['Worker', 'Location', 'Date', 'Days / Price', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((b, i) => (
                <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{b.worker_name}</div>
                    <div className="text-xs text-gray-400">{b.job_type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{b.district}<br />{b.town}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{b.date?.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    <div className="text-white font-semibold">₹{b.total_price?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{b.number_of_days} day(s)</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status] ?? 'bg-gray-800 text-gray-400'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{b.created_at?.split('T')[0]}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-12">No bookings found.</p>}
        </div>
      )}
    </div>
  );
}
