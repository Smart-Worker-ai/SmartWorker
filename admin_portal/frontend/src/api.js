// ─────────────────────────────────────────────────────────────────────────────
// Admin Portal API client.
//
// Auth via httpOnly `admin_session` cookie (set by /api/auth/login). The
// browser attaches it automatically when `withCredentials` is on. The
// readable `csrf_token` cookie is mirrored back into the X-CSRF-Token header
// on every state-changing request (double-submit pattern).
//
// On 401 we hit /api/auth/logout to clear cookies then bounce to /login.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,            // send cookies on every call
});

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  // Transition: keep sending Bearer if a localStorage token still exists
  // from older builds. Server prefers cookie; this keeps stale sessions
  // alive through one extra refresh.
  const legacy = localStorage.getItem('admin_token');
  if (legacy && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${legacy}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      try { await axios.post('/api/auth/logout', null, { withCredentials: true }); }
      catch { /* noop */ }
      localStorage.removeItem('admin_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
