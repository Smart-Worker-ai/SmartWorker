import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import api from '../api.js';

const empty = { name: '', phone: '', trade: '', role: '', town: '', notes: '', active: true };

// Must match the trade names the customer site counts for availability.
const TRADES = [
  'General Labour',
  'Concrete Finisher / Cement Setter',
  'Wall Builder',
  'Stone Breaker / Stone Setter',
  'Tiler',
  'Painter',
];

export default function CrewPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');

  function load() { api.get('/crew').then((r) => setRows(r.data.crew || [])); }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    await api.post('/crew', form);
    setForm(empty);
    load();
  }

  async function onCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/crew/import', fd);
    setMsg(`Imported ${data.added} rows${data.errors?.length ? `; ${data.errors.length} issues` : ''}.`);
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
          {['csv', 'xlsx', 'json'].map((fmt) => (
            <a key={fmt} className="btn-ghost !py-2 text-xs uppercase" href={`/api/crew/export?fmt=${fmt}`}><Download size={14} /> {fmt}</a>
          ))}
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-3">
        {['name', 'phone', 'trade', 'role', 'town'].map((k) => (
          k === 'trade' ? (
            <select key={k} className="field" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} required>
              <option value="" disabled>trade</option>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <input key={k} className="field" placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === 'name'} />
          )
        ))}
        <button className="btn-primary sm:col-span-3 md:col-span-1" type="submit">Add crew member</button>
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
