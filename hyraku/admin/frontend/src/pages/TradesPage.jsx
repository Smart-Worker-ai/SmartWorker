import { useEffect, useState } from 'react';
import api from '../api.js';

const ROLE_SETS = [
  { id: 'labour', label: 'Labour' },
  { id: 'mason_helper', label: 'Mason & Helper' },
  { id: 'painter', label: 'Painter / Labour' },
];

export default function TradesPage() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [roleSet, setRoleSet] = useState('labour');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/trades').then((r) => setRows(r.data.trades || []));
  }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/trades', { name, role_set: roleSet, available: true });
      setName('');
      setRoleSet('labour');
      setMsg('Trade added. Toggle Available when it should show on the booking page.');
      load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row) {
    await api.patch(`/trades/${row.id}/status`, { available: !row.available });
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Current Trades</h1>
        <p className="text-sm text-slate-500">Customers only see Available or Not available — not crew counts.</p>
      </div>

      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
          New trade
          <input
            className="field mt-1"
            placeholder="Trade name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Roles
          <select className="field mt-1" value={roleSet} onChange={(e) => setRoleSet(e.target.value)}>
            {ROLE_SETS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <button className="btn-primary sm:col-span-3 md:col-span-1" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Add trade'}
        </button>
        {msg && <p className="sm:col-span-3 text-sm text-emerald-700">{msg}</p>}
        {err && <p className="sm:col-span-3 text-sm text-rose-600">{err}</p>}
      </form>

      <div className="overflow-x-auto card !p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-slate-500">
            <tr>
              {['Trade', 'Roles', 'Booking status'].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-sky-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{t.name}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{(t.crew_roles || []).join(', ')}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border ${
                      t.available
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {t.available ? 'Available' : 'Unavailable'}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-400">No trades yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
