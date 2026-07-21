import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, XCircle, Lock, Unlock, Trash2, Eye, Search, Filter } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function AdminPortal() {
  const navigate = useNavigate();
  const { isDark, t } = useTheme();

  const [adminSecret, setAdminSecret] = useState(sessionStorage.getItem('admin_secret') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('admin_secret'));
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionInProgress, setActionInProgress] = useState(null);

  // Authenticate admin
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminSecret.trim()) {
      setError(t('Please enter admin secret'));
      return;
    }
    try {
      sessionStorage.setItem('admin_secret', adminSecret);
      setIsAuthenticated(true);
      setError('');
      fetchWorkers();
    } catch (err) {
      setError(t('Authentication failed'));
    }
  };

  // Fetch workers list
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/workers/admin/all`, {
        headers: { 'x-admin-secret': sessionStorage.getItem('admin_secret') },
      });
      setWorkers(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || t('Failed to fetch workers'));
      if (err.response?.status === 403) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_secret');
      }
    } finally {
      setLoading(false);
    }
  };

  // Admin actions
  const performAction = async (workerId, action) => {
    setActionInProgress(`${workerId}-${action}`);
    try {
      const endpoints = {
        approve: `/api/workers/admin/${workerId}/approve`,
        reject: `/api/workers/admin/${workerId}/reject`,
        block: `/api/workers/admin/${workerId}/block`,
        unblock: `/api/workers/admin/${workerId}/unblock`,
        delete: `/api/workers/admin/${workerId}`,
      };

      const method = action === 'delete' ? 'delete' : 'post';
      await axios({
        method,
        url: `${API_BASE}${endpoints[action]}`,
        headers: { 'x-admin-secret': sessionStorage.getItem('admin_secret') },
      });
      fetchWorkers();
    } catch (err) {
      setError(`Action failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem('admin_secret');
    setIsAuthenticated(false);
    setAdminSecret('');
    setWorkers([]);
  };

  // Filter workers
  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.phone?.includes(searchTerm) ||
      w.worker_uid?.includes(searchTerm);

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && w.status === filterStatus;
  });

  // Login form
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md p-8 rounded-3xl shadow-xl transition-colors duration-300 ${
            isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-8">
            <Lock className="w-8 h-8 text-brand-600" />
            <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('Admin Portal')}
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {t('Admin Secret')}
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder={t('Enter admin secret')}
                className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:border-brand-500 focus:outline-none`}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {t('Login')}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Workers dashboard
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <nav className={`sticky top-0 z-40 border-b backdrop-blur transition-colors duration-300 ${
        isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('SmartWorker Admin')}
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('Logout')}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('Search by name, email, phone...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:border-brand-500 focus:outline-none`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border transition-colors ${
              isDark
                ? 'bg-gray-900 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:border-brand-500 focus:outline-none`}
          >
            <option value="all">{t('All Status')}</option>
            <option value="pending">{t('Pending')}</option>
            <option value="approved">{t('Approved')}</option>
            <option value="rejected">{t('Rejected')}</option>
            <option value="blocked">{t('Blocked')}</option>
          </select>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className={`mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('Loading workers...')}</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border-2 border-dashed transition-colors ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {searchTerm || filterStatus !== 'all' ? t('No workers match your filters') : t('No workers registered yet')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWorkers.map((worker) => (
              <motion.div
                key={worker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border transition-colors ${
                  isDark
                    ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>{t('Name')}</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {worker.name}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {worker.worker_uid}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>{t('Contact')}</p>
                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{worker.phone}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {worker.email}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>{t('Skills')}</p>
                    <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {worker.job_type || '—'}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {worker.district}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${
                      isDark ? 'text-gray-500' : 'text-gray-500'
                    }`}>{t('Status')}</p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      worker.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                      worker.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                      worker.status === 'blocked' ? 'bg-orange-500/20 text-orange-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {t(worker.status || 'pending')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-700/50">
                  {worker.status !== 'approved' && (
                    <button
                      onClick={() => performAction(worker.id, 'approve')}
                      disabled={actionInProgress === `${worker.id}-approve`}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionInProgress === `${worker.id}-approve` ? t('Approving...') : t('Approve')}
                    </button>
                  )}
                  {worker.status !== 'rejected' && worker.status !== 'approved' && (
                    <button
                      onClick={() => performAction(worker.id, 'reject')}
                      disabled={actionInProgress === `${worker.id}-reject`}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {actionInProgress === `${worker.id}-reject` ? t('Rejecting...') : t('Reject')}
                    </button>
                  )}
                  {worker.status !== 'blocked' && (
                    <button
                      onClick={() => performAction(worker.id, 'block')}
                      disabled={actionInProgress === `${worker.id}-block`}
                      className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      {actionInProgress === `${worker.id}-block` ? t('Blocking...') : t('Block')}
                    </button>
                  )}
                  {worker.status === 'blocked' && (
                    <button
                      onClick={() => performAction(worker.id, 'unblock')}
                      disabled={actionInProgress === `${worker.id}-unblock`}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      {actionInProgress === `${worker.id}-unblock` ? t('Unblocking...') : t('Unblock')}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/admin/worker/${worker.id}`)}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-500/20 hover:bg-brand-500/30 text-brand-500 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {t('View')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
