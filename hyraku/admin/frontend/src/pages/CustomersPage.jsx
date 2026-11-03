import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../api.js';

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/customers').then((r) => setRows(r.data.customers || [])); }, []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black text-ink">Customers</h1>
        <div className="flex gap-2">
          {['csv', 'pdf'].map((fmt) => (
            <a key={fmt} className="btn-ghost !py-2 text-xs uppercase" href={`/api/customers/export?fmt=${fmt}`}><Download size={14} /> {fmt}</a>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-500">Contact details only — name, phone, town, locality. Enquiry payload is not included.</p>
      <div className="overflow-x-auto card !p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-slate-500">
            <tr>{['Name', 'Phone', 'Town', 'Locality', 'Last contact'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-sky-50">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3">+91 {c.phone}</td>
                <td className="px-4 py-3">{c.town}</td>
                <td className="px-4 py-3">{c.locality}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{c.last_enquiry_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
