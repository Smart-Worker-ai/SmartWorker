import { useEffect, useMemo, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import api from '../api.js';

const empty = { name: '', phone: '', trade: '', role: '', town: '', notes: '', active: true };

const TRADES = [
  'General Labour',
  'Concrete Finisher / Cement Setter',
  'Wall Builder',
  'Stone Breaker / Stone Setter',
  'Tiler',
  'Painter',
];

const ROLES = {
  'General Labour': ['Labour'],
  'Concrete Finisher / Cement Setter': ['Head Mason', 'Helper'],
  'Wall Builder': ['Head Mason', 'Helper'],
  'Stone Breaker / Stone Setter': ['Head Mason', 'Helper'],
  'Tiler': ['Head Mason', 'Helper'],
  'Painter': ['Painter', 'Labour'],
};

function isLetterText(value) {
  const text = (value || '').trim();
  if (text.length < 2 || text.length > 80 || !/^\p{L}/u.test(text)) return false;
  return [...text].every((ch) => /\p{L}/u.test(ch) || " .'-".includes(ch));
}

function normalizeMobile(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  return digits.length > 10 && digits.startsWith('91') ? digits.slice(-10) : digits;
}

function validateCrew(form, existingPhones, excludePhone = '') {
  const errors = {};
  if (!isLetterText(form.name)) errors.name = 'Name is required (2–80 letters).';
  const phone = normalizeMobile(form.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  else if (existingPhones.has(phone) && phone !== excludePhone) errors.phone = 'This mobile number is already on the crew roster.';
  if (!TRADES.includes(form.trade)) errors.trade = 'Select a trade.';
  const allowed = ROLES[form.trade] || [];
  if (!allowed.includes(form.role)) errors.role = 'Select a role for this trade.';
  if (form.town.trim() && !isLetterText(form.town)) errors.town = 'Town must be 2–80 letters.';
  if ((form.notes || '').trim().length > 500) errors.notes = 'Notes must be 500 characters or fewer.';
  return errors;
}

export default function CrewPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function load() { api.get('/crew').then((r) => setRows(r.data.crew || [])); }
  useEffect(load, []);

  const existingPhones = useMemo(
    () => new Set(rows.map((w) => normalizeMobile(w.phone)).filter(Boolean)),
    [rows],
  );
  const roleOptions = ROLES[form.trade] || [];

  function setField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'trade') {
        const allowed = ROLES[value] || [];
        if (!allowed.includes(next.role)) next.role = allowed[0] || '';
      }
      if (key === 'phone') next.phone = value.replace(/\D/g, '').slice(0, 10);
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function add(e) {
    e.preventDefault();
    const nextErrors = validateCrew(form, existingPhones);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMsg('');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await api.post('/crew', { ...form, phone: normalizeMobile(form.phone), notes: form.notes.trim(), town: form.town.trim() });
      setForm(empty);
      setErrors({});
      setMsg('Crew member added.');
      load();
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message }));
    } finally {
      setBusy(false);
    }
  }

  async function onCsv(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/crew/import', fd);
    setMsg(`Imported ${data.added} rows${data.errors?.length ? `; ${data.errors.length} issues` : ''}.`);
    if (data.errors?.length) setErrors({ form: data.errors.slice(0, 6).join(' ') });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Crew</h1>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost !py-2 text-xs" href="/api/crew/template.csv">CSV template</a>
          <label className="btn-ghost !py-2 text-xs cursor-pointer">
            <Upload size={14} /> Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={onCsv} />
          </label>
          {['csv', 'pdf'].map((fmt) => (
            <a key={fmt} className="btn-ghost !py-2 text-xs uppercase" href={`/api/crew/export?fmt=${fmt}`}><Download size={14} /> {fmt}</a>
          ))}
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-3" noValidate>
        <label className="block text-xs font-semibold text-slate-600">
          Name *
          <input className="field mt-1" placeholder="Full name" value={form.name} onChange={(e) => setField('name', e.target.value)} maxLength={80} required />
          {errors.name && <span className="mt-1 block text-rose-600">{errors.name}</span>}
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Mobile *
          <input className="field mt-1" inputMode="numeric" placeholder="10-digit mobile" value={form.phone} onChange={(e) => setField('phone', e.target.value)} maxLength={10} required />
          {errors.phone && <span className="mt-1 block text-rose-600">{errors.phone}</span>}
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Trade *
          <select className="field mt-1" value={form.trade} onChange={(e) => setField('trade', e.target.value)} required>
            <option value="" disabled>Select trade</option>
            {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.trade && <span className="mt-1 block text-rose-600">{errors.trade}</span>}
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Role *
          <select className="field mt-1" value={form.role} onChange={(e) => setField('role', e.target.value)} required disabled={!form.trade}>
            <option value="" disabled>{form.trade ? 'Select role' : 'Select trade first'}</option>
            {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {errors.role && <span className="mt-1 block text-rose-600">{errors.role}</span>}
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Town
          <input className="field mt-1" placeholder="Town (optional)" value={form.town} onChange={(e) => setField('town', e.target.value)} maxLength={80} />
          {errors.town && <span className="mt-1 block text-rose-600">{errors.town}</span>}
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
          Active on roster
        </label>
        <label className="block text-xs font-semibold text-slate-600 sm:col-span-3">
          Notes
          <textarea className="field mt-1 min-h-[4.5rem]" placeholder="Optional notes (max 500)" value={form.notes} onChange={(e) => setField('notes', e.target.value)} maxLength={500} />
          {errors.notes && <span className="mt-1 block text-rose-600">{errors.notes}</span>}
        </label>
        {errors.form && <p className="sm:col-span-3 text-sm text-rose-600">{errors.form}</p>}
        <button className="btn-primary sm:col-span-3 md:col-span-1" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add crew member'}</button>
      </form>
      <div className="overflow-x-auto card !p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-slate-500">
            <tr>{['Name', 'Phone', 'Trade', 'Role', 'Town', 'Active'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-sky-50">
                <td className="px-4 py-3 font-semibold">{w.name}</td>
                <td className="px-4 py-3">{w.phone}</td>
                <td className="px-4 py-3">{w.trade}</td>
                <td className="px-4 py-3">{w.role}</td>
                <td className="px-4 py-3">{w.town}</td>
                <td className="px-4 py-3">{w.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No crew on the roster yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
