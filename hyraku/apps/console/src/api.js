const KEY_STORAGE = 'hyraku.adminKey';

export function getKey() {
  return localStorage.getItem(KEY_STORAGE) ?? '';
}

export function setKey(k) {
  localStorage.setItem(KEY_STORAGE, k);
}

export function clearKey() {
  localStorage.removeItem(KEY_STORAGE);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getKey(),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearKey();
    window.dispatchEvent(new Event('hyraku:unauthorised'));
    throw new Error('Unauthorised');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  login: (password) =>
    request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  stats: () => request('/api/admin/stats'),
  jobs: (status = 'open') => request(`/api/admin/jobs?status=${status}`),
  candidates: (jobId) => request(`/api/admin/jobs/${jobId}/candidates`),
  assign: (jobId, body) =>
    request(`/api/admin/jobs/${jobId}/assign`, { method: 'POST', body: JSON.stringify(body) }),
  jobStatus: (jobId, status) =>
    request(`/api/admin/jobs/${jobId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),

  workers: (status = 'pending') => request(`/api/admin/workers?status=${status}`),
  workerStatus: (id, status, reason) =>
    request(`/api/admin/workers/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    }),

  conversations: () => request('/api/admin/conversations'),

  // Simulator — no admin key required, it stands in for the public channel.
  personas: () => request('/api/sim/personas'),
  thread: (phone) => request(`/api/sim/thread/${encodeURIComponent(phone)}`),
  send: (body) => request('/api/sim/send', { method: 'POST', body: JSON.stringify(body) }),
  reset: (phone) => request(`/api/sim/reset/${encodeURIComponent(phone)}`, { method: 'POST' }),
};
