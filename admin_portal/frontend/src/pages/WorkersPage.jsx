import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, CheckCircle, ShieldCheck, Star } from 'lucide-react';
import api from '../api';

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = () => api.get('/workers').then(r => setWorkers(r.data.workers ?? [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const action = async (id, type) => {
    setActionId(`${id}-${type}`);
    try {
      await api.post(`/workers/${id}/${type}`);
      await load();
    } finally { setActionId(null); }
  };

  const filtered = workers.filter(w =>
    [w.name, w.job_type, w.district, w.town].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-white mb-2">Workers</h1>
      <p className="text-gray-400 text-sm mb-6">{workers.length} workers in system</p>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, job type, district…"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                {['Worker', 'Location', 'Rate / Rating', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((w, i) => (
                <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{w.name}</div>
                    <div className="text-xs text-gray-400">{w.job_type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {w.district}<br />{w.town}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-semibold">₹{w.daily_rate}/day</div>
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Star className="w-3 h-3" /> {w.rating} ({w.total_reviews})
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${w.is_blocked ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                        {w.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${w.is_verified ? 'bg-blue-900/40 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                        {w.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => action(w.id, w.is_blocked ? 'unblock' : 'block')}
                        disabled={!!actionId}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                          ${w.is_blocked ? 'bg-green-800 hover:bg-green-700 text-green-300' : 'bg-red-900/50 hover:bg-red-800 text-red-400'}`}>
                        {w.is_blocked ? <><CheckCircle className="w-3 h-3" /> Unblock</> : <><Ban className="w-3 h-3" /> Block</>}
                      </button>
                      {!w.is_verified && (
                        <button onClick={() => action(w.id, 'verify')}
                          disabled={!!actionId}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-800 hover:bg-blue-700 text-blue-300 transition-colors">
                          <ShieldCheck className="w-3 h-3" /> Verify
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-12">No workers found.</p>}
        </div>
      )}
    </div>
  );
}
