import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Check } from 'lucide-react';
import api from '../api';

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [resolveId, setResolveId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/grievances${params}`).then(r => setGrievances(r.data.grievances ?? [])).finally(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); load(); }, [statusFilter]);

  const resolve = async (id) => {
    setResolving(true);
    try {
      await api.patch(`/grievances/${id}`, { status: 'closed', adminNote });
      setResolveId(null); setAdminNote('');
      await load();
    } finally { setResolving(false); }
  };

  const filtered = grievances.filter(g =>
    [g.subject, g.description].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-white mb-2">Grievances</h1>
      <p className="text-gray-400 text-sm mb-6">{grievances.length} total grievances</p>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by subject or description…"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <button className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${g.status === 'open' ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                      {g.status.toUpperCase()}
                    </span>
                    <span className="font-semibold text-white">{g.subject}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{g.created_at?.split('T')[0]}</p>
                </div>
                {expanded === g.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              <AnimatePresence>
                {expanded === g.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 space-y-4 border-t border-gray-800">
                      <p className="text-gray-300 text-sm pt-4 leading-relaxed">{g.description}</p>

                      {g.admin_note && (
                        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
                          <p className="text-xs font-semibold text-blue-400 mb-1">Admin Response</p>
                          <p className="text-sm text-blue-300">{g.admin_note}</p>
                        </div>
                      )}

                      {g.status === 'open' && (
                        resolveId === g.id ? (
                          <div className="space-y-3">
                            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              rows={3} placeholder="Add a response note for the customer (optional)…" />
                            <div className="flex gap-3">
                              <button onClick={() => resolve(g.id)} disabled={resolving}
                                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                                <Check className="w-4 h-4" /> {resolving ? 'Resolving…' : 'Mark Resolved'}
                              </button>
                              <button onClick={() => { setResolveId(null); setAdminNote(''); }}
                                className="text-gray-400 hover:text-white px-4 py-2 text-sm transition-colors">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolveId(g.id)}
                            className="bg-indigo-700 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                            Resolve Grievance
                          </button>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-500 py-12">No grievances found.</p>}
        </div>
      )}
    </div>
  );
}
