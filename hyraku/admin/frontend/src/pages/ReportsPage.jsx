import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../api.js';

export default function ReportsPage() {
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState(null);

  async function load(e) {
    e?.preventDefault();
    const { data: d } = await api.get('/reports/monthly', { params: { month } });
    setData(d);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-ink">Monthly report</h1>
      <form onSubmit={load} className="card flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">Month
          <input className="field mt-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button className="btn-primary" type="submit">Build summary</button>
        <a className="btn-ghost" href={`/api/reports/monthly.pdf?month=${month}`}><Download size={14} /> PDF</a>
        <a className="btn-ghost" href={`/api/reports/monthly.csv?month=${month}`}><Download size={14} /> CSV</a>
      </form>
      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.stats).filter(([k]) => !['top_locations', 'by_status'].includes(k)).map(([k, v]) => (
            <div key={k} className="card">
              <div className="text-xs font-bold uppercase text-slate-400">{k.replaceAll('_', ' ')}</div>
              <div className="font-display text-2xl font-black text-ink">{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
