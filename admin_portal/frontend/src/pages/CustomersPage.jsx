import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, CheckCircle, User } from 'lucide-react';
import api from '../api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = () => api.get('/customers').then(r => setCustomers(r.data.customers ?? [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggle = async (id, blocked) => {
    setActionId(id);
    try {
      await api.post(`/customers/${id}/${blocked ? 'unblock' : 'block'}`);
      await load();
    } finally { setActionId(null); }
  };

  const filtered = customers.filter(c =>
    [c.name, c.email, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-white mb-2">Customers</h1>
      <p className="text-gray-400 text-sm mb-6">{customers.length} registered customers</p>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                {['Customer', 'Contact', 'Status', 'Joined', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-indigo-900 rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <span className="font-medium text-white">{c.name || 'No name'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <div>{c.email || '—'}</div>
                    <div className="text-xs">{c.phone || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_blocked ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                      {c.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.created_at?.split('T')[0]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(c.id, c.is_blocked)}
                      disabled={actionId === c.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                        ${c.is_blocked ? 'bg-green-800 hover:bg-green-700 text-green-300' : 'bg-red-900/50 hover:bg-red-800 text-red-400'}`}
                    >
                      {c.is_blocked ? <><CheckCircle className="w-3.5 h-3.5" /> Unblock</> : <><Ban className="w-3.5 h-3.5" /> Block</>}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 py-12">No customers found.</p>}
        </div>
      )}
    </div>
  );
}
