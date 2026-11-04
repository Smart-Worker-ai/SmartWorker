import { useEffect, useState } from 'react';
import api from '../api.js';

const STATUSES = ['requested', 'checking', 'confirmed', 'booked', 'completed', 'cancelled', 'out_of_service'];

export default function EnquiriesPage() {
  const [rows, setRows] = useState([]);
  const [pay, setPay] = useState(null);
  const [form, setForm] = useState({ payment_amount: '', payment_mode: 'upi', payment_ref: '', days: 1 });

  function load() {
    api.get('/enquiries').then((r) => setRows(r.data.enquiries || []));
  }
  useEffect(load, []);

  async function status(id, value) {
    await api.patch(`/enquiries/${id}/status`, { status: value });
    load();
  }

  async function book(e) {
    e.preventDefault();
    await api.post(`/enquiries/${pay.id}/book`, { ...form, payment_amount: Number(form.payment_amount), days: Number(form.days) });
    setPay(null);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-ink">Enquiries</h1>
      <div className="overflow-x-auto card !p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-slate-500">
            <tr>
              {['Ref', 'Customer', 'Location', 'Crew', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-sky-50">
                <td className="px-4 py-3 font-mono text-xs">{r.ref_code}</td>
                <td className="px-4 py-3"><div className="font-semibold">{r.customer_name}</div><div className="text-xs text-slate-500">+91 {r.phone}</div></td>
                <td className="px-4 py-3 text-xs">{r.locality}, {r.town}</td>
                <td className="px-4 py-3 text-xs max-w-[200px] truncate">{r.crew_summary}</td>
                <td className="px-4 py-3">
                  <select className="field !py-1.5 text-xs" value={r.status} onChange={(e) => status(r.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  {!r.has_booking && <button className="btn-primary !py-1.5 !text-xs" onClick={() => setPay(r)}>Record payment</button>}
                  <a className="btn-ghost !py-1.5 !text-xs" href={`/api/enquiries/${r.id}/letterpad.pdf`} target="_blank" rel="noreferrer">Print letterpad</a>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No enquiries yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {pay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={book} className="card w-full max-w-md space-y-3">
            <h2 className="font-display font-bold">Payment for {pay.ref_code}</h2>
            <input className="field" type="number" required placeholder="Amount (INR)" value={form.payment_amount} onChange={(e) => setForm({ ...form, payment_amount: e.target.value })} />
            <select className="field" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
              <option value="upi">UPI</option><option value="cash">Cash</option><option value="bank">Bank transfer</option>
            </select>
            <input className="field" placeholder="UTR / reference" value={form.payment_ref} onChange={(e) => setForm({ ...form, payment_ref: e.target.value })} />
            <input className="field" type="number" min={1} max={5} value={form.days} onChange={(e) => setForm({ ...form, days: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" type="submit">Mark booked</button>
              <button className="btn-ghost" type="button" onClick={() => setPay(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
