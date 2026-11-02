import { useEffect, useState } from 'react';
import api from '../api.js';

export default function BookingsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/bookings').then((r) => setRows(r.data.bookings || [])); }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-ink">Paid bookings</h1>
      <div className="overflow-x-auto card !p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-sky-50 text-xs uppercase text-slate-500">
            <tr>{['Invoice', 'Customer', 'Amount', 'Mode', 'Print'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-sky-50">
                <td className="px-4 py-3 font-mono text-xs">{b.invoice_no}</td>
                <td className="px-4 py-3">{b.enquiry?.customer_name}<div className="text-xs text-slate-500">{b.enquiry?.ref_code}</div></td>
                <td className="px-4 py-3 font-bold">₹{b.payment_amount?.toLocaleString()}</td>
                <td className="px-4 py-3 uppercase text-xs">{b.payment_mode}</td>
                <td className="px-4 py-3">
                  {b.enquiry && <a className="btn-primary !py-1.5 !text-xs" href={`/api/enquiries/${b.enquiry.id}/letterpad.pdf`} target="_blank" rel="noreferrer">Letterpad PDF</a>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No paid bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
