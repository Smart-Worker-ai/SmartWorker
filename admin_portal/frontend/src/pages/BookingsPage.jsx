import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

const STATUS_COLORS = {
  pending:   'bg-yellow-900/40 text-yellow-400',
  confirmed: 'bg-blue-900/40 text-blue-400',
  completed: 'bg-green-900/40 text-green-400',
  cancelled: 'bg-red-900/40 text-red-400',
};

export default function BookingsPage() {
  const { isDark, t } = useTheme();
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
    <div className={`p-4 md:p-8 transition-colors ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <h1 className={`text-xl md:text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('bookings')}</h1>
      <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{bookings.length} {t('bookings')}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className={`w-full rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-colors ${isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-900'}`} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className={`rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors ${isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
          <option value="">{t('allStatus')}</option>
          <option value="pending">{t('pending')}</option>
          <option value="confirmed">{t('confirmed')}</option>
          <option value="completed">{t('completed')}</option>
          <option value="cancelled">{t('cancelled')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className={`rounded-2xl overflow-hidden border-2 transition-colors ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="overflow-x-auto">
          <table className={`w-full text-sm min-w-[640px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <thead className={`transition-colors ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              <tr>
                {[t('worker'), t('location'), t('date'), t('daysPrice'), t('status'), t('created')].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {filtered.map((b, i) => (
                <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className={`transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{b.worker_name}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{b.job_type}</div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{b.district}<br />{b.town}</td>
                  <td className={`px-4 py-3 text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{b.date?.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{b.total_price?.toLocaleString()}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{b.number_of_days} {t('days')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status] ?? (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600')}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{b.created_at?.split('T')[0]}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('noBookingsFound')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
