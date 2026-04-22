import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ban, CheckCircle, ShieldCheck, Star, Clock, XCircle, ChevronDown, ChevronUp, FileText, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

function ConfirmDialog({ name, type, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="w-12 h-12 bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-black text-white text-center mb-2">Delete {type}?</h3>
          <p className="text-gray-400 text-sm text-center mb-6">
            <span className="text-white font-semibold">{name}</span> will be permanently deleted along with all related records. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-400 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DocLink({ label, url }) {
  if (!url) return <span className="text-gray-600 text-xs">Not uploaded</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-700/50 text-indigo-300 rounded-lg text-xs font-medium transition-colors">
      <FileText className="w-3.5 h-3.5" /> {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function WorkerDetail({ workerId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/workers/${workerId}/detail`)
      .then(r => setDetail(r.data.worker))
      .finally(() => setLoading(false));
  }, [workerId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!detail) return <p className="text-gray-500 text-sm py-4 text-center">Failed to load details.</p>;

  const rows = [
    ['Full Name', detail.name],
    ['Age', detail.age],
    ['Gender', detail.gender],
    ['Mobile', detail.mobile],
    ['Address', detail.address || '—'],
    ['Job Type', detail.job_type],
    ['Daily Rate', `₹${detail.daily_rate}`],
    ['Experience', `${detail.experience_years} yrs`],
    ['Current District', detail.current_location],
    ['Preferred District', detail.district],
    ['Preferred Town', detail.town],
    ['Interested Locations', detail.interested_locations],
    ['Facilities Requested', detail.facilities_requested || 'None'],
    ['Registration Date', detail.created_at?.split('T')[0]],
  ];

  return (
    <div className="px-6 pb-6 border-t border-gray-700 bg-gray-800/30">
      <div className="pt-5 grid md:grid-cols-2 gap-6">
        {/* Info */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Worker Details</p>
          <div className="space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1.5 border-b border-gray-700/50">
                <span className="text-gray-500 text-xs font-medium">{k}</span>
                <span className="text-gray-200 font-medium text-right max-w-[55%] text-xs">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents + Photo */}
        <div className="space-y-4">
          {detail.profile_photo && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Profile Photo</p>
              <img src={detail.profile_photo} alt="Profile"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-600" />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Verification Documents</p>
            <div className="space-y-2">
              <DocLink label="Aadhaar Card" url={detail.aadhar_photo} />
              <DocLink label="Passbook" url={detail.passbook_photo} />
            </div>
            <p className="text-xs text-gray-600 mt-3">Documents open in a new tab directly from the Worker Portal server.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const { isDark, t, lang } = useTheme();
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [tab, setTab] = useState('portal');
  const [expanded, setExpanded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => api.get('/workers').then(r => setWorkers(r.data.workers ?? [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const action = async (id, type, source = 'main') => {
    setActionId(`${id}-${type}`);
    try {
      const qs = source === 'portal' ? '?source=portal' : '';
      await api.post(`/workers/${id}/${type}${qs}`);
      await load();
    } finally { setActionId(null); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionId(`${deleteTarget.id}-delete`);
    const source = deleteTarget._source ?? 'main';
    setDeleteTarget(null);
    try {
      await api.delete(`/workers/${deleteTarget.id}?source=${source}`);
      await load();
    } finally { setActionId(null); }
  };

  const portalWorkers = workers.filter(w => w._source === 'portal');
  const mainWorkers   = workers.filter(w => w._source === 'main');
  const displayed     = (tab === 'portal' ? portalWorkers : mainWorkers)
    .filter(w => [w.name, w.job_type, w.district, w.town, w.mobile].some(
      v => v?.toLowerCase().includes(search.toLowerCase())
    ));

  const STATUS_BADGE = {
    pending:  'bg-yellow-900/40 text-yellow-400',
    approved: 'bg-green-900/40 text-green-400',
    rejected: 'bg-red-900/40 text-red-400',
  };

  return (
    <div className={`p-4 md:p-8 min-h-screen ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.name || 'this worker'}
          type="Worker"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <h1 className={`text-xl md:text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {lang === 'ml' ? 'തൊഴിലാളികൾ' : 'Workers'}
      </h1>
      <p className="text-gray-400 text-sm mb-5">
        {portalWorkers.length} registered · {mainWorkers.length} seeded
      </p>

      <div className="flex gap-2 mb-5">
        {[
          { key: 'portal', label: `Registered (${portalWorkers.length})` },
          { key: 'main',   label: `Seeded (${mainWorkers.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setExpanded(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, job type, mobile…"
          className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className={`border rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className={isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}>
                <tr>
                  {['Worker', 'Location', tab === 'portal' ? 'Mobile / Age' : 'Rate / Rating', 'Status', 'Actions', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((w, i) => (
                  <>
                    <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-800/40 transition-colors border-t border-gray-800 first:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{w.name}</div>
                        <div className="text-xs text-gray-400">{w.job_type}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{w.district}<br />{w.town}</td>

                      {tab === 'portal' ? (
                        <td className="px-4 py-3 text-gray-300 text-xs">
                          {w.mobile || '—'}<br />
                          <span className="text-gray-500">Age {w.age}</span>
                        </td>
                      ) : (
                        <td className="px-4 py-3">
                          <div className="text-white font-semibold">₹{w.daily_rate}/day</div>
                          <div className="flex items-center gap-1 text-yellow-400 text-xs">
                            <Star className="w-3 h-3" /> {w.rating} ({w.total_reviews})
                          </div>
                        </td>
                      )}

                      <td className="px-4 py-3">
                        {tab === 'portal' ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit inline-flex items-center gap-1 ${STATUS_BADGE[w.status] ?? 'bg-gray-800 text-gray-400'}`}>
                            {w.status === 'pending' && <Clock className="w-3 h-3" />}
                            {(w.status || 'pending').toUpperCase()}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${w.is_blocked ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                              {w.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${w.is_verified ? 'bg-blue-900/40 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                              {w.is_verified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 items-center">
                          {tab === 'portal' ? (
                            <>
                              {w.status === 'pending' && (
                                <>
                                  <button onClick={() => action(w.id, 'approve', 'portal')} disabled={!!actionId}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-700 hover:bg-green-600 text-white transition-colors">
                                    <CheckCircle className="w-3 h-3" /> Approve
                                  </button>
                                  <button onClick={() => action(w.id, 'reject', 'portal')} disabled={!!actionId}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-900/60 hover:bg-red-800 text-red-300 transition-colors">
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </>
                              )}
                              <button onClick={() => action(w.id, w.is_blocked ? 'unblock' : 'block', 'portal')} disabled={!!actionId}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                                  ${w.is_blocked ? 'bg-green-800 hover:bg-green-700 text-green-300' : 'bg-red-900/50 hover:bg-red-800 text-red-400'}`}>
                                {w.is_blocked ? <><CheckCircle className="w-3 h-3" /> Unblock</> : <><Ban className="w-3 h-3" /> Block</>}
                              </button>
                              <button onClick={() => setDeleteTarget(w)} disabled={!!actionId}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => action(w.id, w.is_blocked ? 'unblock' : 'block')} disabled={!!actionId}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                                  ${w.is_blocked ? 'bg-green-800 hover:bg-green-700 text-green-300' : 'bg-red-900/50 hover:bg-red-800 text-red-400'}`}>
                                {w.is_blocked ? <><CheckCircle className="w-3 h-3" /> Unblock</> : <><Ban className="w-3 h-3" /> Block</>}
                              </button>
                              {!w.is_verified && (
                                <button onClick={() => action(w.id, 'verify')} disabled={!!actionId}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-800 hover:bg-blue-700 text-blue-300 transition-colors">
                                  <ShieldCheck className="w-3 h-3" /> Verify
                                </button>
                              )}
                              <button onClick={() => setDeleteTarget(w)} disabled={!!actionId}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Expand toggle — only for portal workers */}
                      <td className="px-3 py-3">
                        {tab === 'portal' && (
                          <button onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
                            {expanded === w.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </motion.tr>

                    {/* Expanded detail row */}
                    <AnimatePresence>
                      {expanded === w.id && tab === 'portal' && (
                        <tr key={`${w.id}-detail`}>
                          <td colSpan={6} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden">
                              <WorkerDetail workerId={w.id} onClose={() => setExpanded(null)} />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>
            {displayed.length === 0 && <p className="text-center text-gray-500 py-12">No workers found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
