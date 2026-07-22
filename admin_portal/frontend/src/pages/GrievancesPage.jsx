import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Check } from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

export default function GrievancesPage() {
  const { isDark, t } = useTheme();
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
    <div className={`p-4 md:p-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <h1 className={`text-xl md:text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('grievances')}</h1>
      <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{grievances.length} {t('totalGrievances')}</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className={`absolute left-3.5 top-3.5 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('searchBySubjectDescription')}
            className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className={`border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <option value="">{t('all')}</option>
          <option value="open">{t('open')}</option>
          <option value="closed">{t('closed')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`border rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <button className={`w-full px-6 py-4 flex items-center gap-4 text-left transition-colors ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${g.status === 'open' ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                      {t(g.status)}
                    </span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{g.subject}</span>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{g.created_at?.split('T')[0]}</p>
                </div>
                {expanded === g.id ? <ChevronUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} /> : <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />}
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
                    <div className={`px-6 pb-5 space-y-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                      <p className={`text-sm pt-4 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{g.description}</p>

                      {g.admin_note && (
                        <div className={`border rounded-xl p-4 ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{t('adminResponse')}</p>
                          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{g.admin_note}</p>
                        </div>
                      )}

                      {g.status === 'open' && (
                        resolveId === g.id ? (
                          <div className="space-y-3">
                            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              rows={3} placeholder={t('addResponseNote')} />
                            <div className="flex gap-3">
                              <button onClick={() => resolve(g.id)} disabled={resolving}
                                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                                <Check className="w-4 h-4" /> {resolving ? t('resolving') : t('markResolved')}
                              </button>
                              <button onClick={() => { setResolveId(null); setAdminNote(''); }}
                                className={`px-4 py-2 text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                {t('cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolveId(g.id)}
                            className="bg-indigo-700 hover:bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                            {t('resolveGrievance')}
                          </button>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {filtered.length === 0 && <p className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('noGrievancesFound')}</p>}
        </div>
      )}
    </div>
  );
}
