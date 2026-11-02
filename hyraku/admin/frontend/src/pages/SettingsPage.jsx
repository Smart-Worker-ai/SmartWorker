import { useEffect, useState } from 'react';
import api from '../api.js';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [ok, setOk] = useState('');
  useEffect(() => { api.get('/settings').then((r) => setForm(r.data)); }, []);
  async function save(e) {
    e.preventDefault();
    await api.put('/settings', form);
    setOk('Letterpad details saved.');
  }
  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-3">
      <h1 className="font-display text-2xl font-black text-ink">Hyraku letterpad</h1>
      <p className="text-sm text-slate-500">Printed on booking summaries and invoices. Add GSTIN when you are ready to issue tax invoices.</p>
      {ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>}
      {['legal_name', 'tagline', 'phone', 'email', 'gstin', 'pan'].map((k) => (
        <input key={k} className="field" placeholder={k.replaceAll('_', ' ')} value={form[k] || ''} onChange={set(k)} />
      ))}
      <textarea className="field" rows={3} placeholder="Registered address" value={form.address || ''} onChange={set('address')} />
      <textarea className="field" rows={2} placeholder="Bank details" value={form.bank_details || ''} onChange={set('bank_details')} />
      <textarea className="field" rows={3} placeholder="Terms / footer" value={form.terms || ''} onChange={set('terms')} />
      <button className="btn-primary" type="submit">Save letterpad</button>
    </form>
  );
}
