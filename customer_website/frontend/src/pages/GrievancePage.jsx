import { useEffect, useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { grievanceApi } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

const pick = (o, ...keys) => keys.map((k) => o[k]).find((v) => v !== undefined);

export default function GrievancePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    setLoading(true);
    try {
      setItems(await grievanceApi.mine());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);
    try {
      await grievanceApi.create({ subject: form.subject.trim(), description: form.description.trim() });
      setForm({ subject: '', description: '' });
      setOk('Your complaint has been submitted. Our team will look into it.');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
        <MessageSquareWarning className="text-brand-600" /> Support & Complaints
      </h1>
      <p className="mb-5 text-sm text-slate-500">Raise an issue and track its status.</p>

      <form onSubmit={submit} className="card">
        {error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        {ok && <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>}
        <div>
          <label className="label">Subject</label>
          <input
            required
            className="field"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
        </div>
        <div className="mt-3">
          <label className="label">Description</label>
          <textarea
            required
            rows={4}
            className="field"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn-primary mt-4" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">Your complaints</h2>
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">No complaints raised.</p>
      ) : (
        <div className="space-y-3">
          {items.map((g, i) => (
            <div key={pick(g, 'id') || i} className="card !p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">{pick(g, 'subject')}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs capitalize text-slate-600">
                  {pick(g, 'status') || 'open'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{pick(g, 'description')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
