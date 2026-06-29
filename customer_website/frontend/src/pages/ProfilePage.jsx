import { useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);
    try {
      const res = await authApi.completeProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
      });
      const next = res.user || { ...user, ...form, profileComplete: true };
      setUser(next);
      localStorage.setItem('crewzo_user', JSON.stringify(next));
      setOk('Profile updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <div className="flex items-center gap-3">
          <UserCircle2 size={40} className="text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Your profile</h1>
            <p className="text-sm text-slate-500">{user?.email || user?.phone}</p>
          </div>
        </div>

        {!user?.profileComplete && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Complete your profile to make booking faster.
          </p>
        )}
        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        {ok && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              required
              className="field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="field"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
