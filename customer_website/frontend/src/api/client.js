import axios from 'axios';

// node_backend (customer API) is mounted at /api/v1. In dev, Vite proxies /api
// to localhost:3000; in prod, nginx/Vercel proxies /api to api.crewzo.in.
const TOKEN_KEY = 'crewzo_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise the backend's two error shapes ({error} and {message}) into Error.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) tokenStore.clear();
    const data = err.response?.data;
    const message = data?.error || data?.message || err.message || 'Something went wrong.';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (email, phone) => api.post('/auth/send-otp', { email, phone }).then((r) => r.data),
  verifyOtp: (email, otp) => api.post('/auth/verify-otp', { email, otp }).then((r) => r.data),
  registerEmail: (email, password, name) =>
    api.post('/auth/register-email', { email, password, name }).then((r) => r.data),
  loginEmail: (email, password) =>
    api.post('/auth/login-email', { email, password }).then((r) => r.data),
  verifyFirebasePhone: (idToken) =>
    api.post('/auth/verify-firebase-phone', { idToken }).then((r) => r.data),
  completeProfile: (payload) => api.post('/auth/complete-profile', payload).then((r) => r.data),
};

// ── Workers / bookings ──────────────────────────────────────────────────────────
export const workersApi = {
  list: (params) => api.get('/bookings/workers', { params }).then((r) => r.data.workers),
  get: (id) => api.get(`/bookings/workers/${id}`).then((r) => r.data.worker),
};

export const bookingsApi = {
  create: (payload) => api.post('/bookings', payload).then((r) => r.data.booking),
  mine: () => api.get('/bookings/my').then((r) => r.data.bookings),
  cancel: (id) => api.delete(`/bookings/${id}`).then((r) => r.data.booking),
};

// ── Feedback / grievances ─────────────────────────────────────────────────────
export const feedbackApi = {
  forWorker: (workerId) => api.get(`/feedback/worker/${workerId}`).then((r) => r.data.feedback),
  submit: (payload) => api.post('/feedback', payload).then((r) => r.data),
};

export const grievanceApi = {
  create: (payload) => api.post('/grievances', payload).then((r) => r.data.grievance),
  mine: () => api.get('/grievances/my').then((r) => r.data.grievances),
};

export default api;
