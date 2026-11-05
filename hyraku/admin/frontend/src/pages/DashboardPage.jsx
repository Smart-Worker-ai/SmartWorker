import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { MessageSquare, HardHat, CheckCircle2, MapPin, Wallet, AlertTriangle } from 'lucide-react';
import api from '../api.js';

function Card({ icon: Icon, label, value }) {
  return (
    <div className="card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-[#0091ea]"><Icon size={18} /></div>
      <div className="font-display text-2xl font-black text-ink">{value ?? '—'}</div>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/dashboard/stats').then((r) => setS(r.data)); }, []);
  if (!s) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Operations</h1>
        <p className="text-sm text-slate-500">Demand, crew, and enquiry health</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <Card icon={MessageSquare} label="Enquiries" value={s.totalEnquiries} />
        <Card icon={Wallet} label="Open" value={s.requested} />
        <Card icon={CheckCircle2} label="Booked" value={s.booked} />
        <Card icon={CheckCircle2} label="Completed" value={s.completed} />
        <Card icon={MapPin} label="Out of service" value={s.outOfService} />
        <Card icon={HardHat} label="Active crew" value={s.crew} />
        <Card icon={AlertTriangle} label="Crew short vs roster" value={s.crewShortageCount ?? 0} />
      </div>
      {(s.crewShortages || []).length > 0 && (
        <div className="card border border-amber-200 bg-amber-50/60">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-amber-950">Requirement above roster</h2>
            <Link to="/enquiries" className="text-xs font-bold text-amber-800 hover:underline">Open enquiries</Link>
          </div>
          <p className="mb-3 text-xs text-amber-800">Internal only — the customer is not shown this. Asked vs active crew on file.</p>
          <div className="space-y-2">
            {s.crewShortages.map((row) => (
              <div key={row.id} className="rounded-xl border border-amber-200 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700">{row.ref_code}</span>
                  <span className="text-xs font-semibold text-slate-600">{row.customer_name} · {row.status}</span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {(row.shortages || []).map((g) => (
                    <li key={g.trade} className="text-sm text-amber-950">
                      <span className="font-semibold">{g.trade_name}</span>
                      {' — '}asked {g.requested}, roster {g.on_roster}
                      <span className="font-bold text-rose-700"> (short {g.short_by})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-display font-bold text-ink">Demand by town</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={s.byTown} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis type="category" dataKey="label" width={110} stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0091ea" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="mb-4 font-display font-bold text-ink">Enquiries over time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={s.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0091ea" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h2 className="mb-3 font-display font-bold text-ink">Hottest localities</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(s.byLocality || []).slice(0, 12).map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-sm">
              <span className="truncate font-medium text-slate-700">{r.label}</span>
              <span className="font-black text-[#0091ea]">{r.count}</span>
            </div>
          ))}
          {!s.byLocality?.length && <p className="text-sm text-slate-400">No locality data yet.</p>}
        </div>
      </div>
    </div>
  );
}
