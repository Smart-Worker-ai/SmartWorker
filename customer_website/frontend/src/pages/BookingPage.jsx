import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { workersApi, bookingsApi } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';

// datetime-local value (no timezone) for "now + hours", trimmed to minutes.
function minDateTimeLocal(hoursAhead = 24) {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const minDt = minDateTimeLocal(24);
  const [form, setForm] = useState({ date: '', numberOfDays: 1, address: '', notes: '' });

  useEffect(() => {
    (async () => {
      try {
        setWorker(await workersApi.get(id));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await bookingsApi.create({
        workerId: id,
        date: new Date(form.date).toISOString(),
        numberOfDays: Number(form.numberOfDays),
        address: form.address.trim(),
        notes: form.notes.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => navigate('/bookings'), 1400);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading…" />;
  if (error && !worker) return <p className="rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-600">{error}</p>;

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="card">
          <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Booking confirmed!</h1>
          <p className="mt-1 text-sm text-slate-500">A confirmation email is on its way. Redirecting…</p>
        </div>
      </div>
    );
  }

  const total = worker ? worker.dailyRate * Number(form.numberOfDays || 0) : 0;

  return (
    <div className="mx-auto max-w-lg">
      <Link to={`/workers/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="card">
        <h1 className="text-xl font-bold text-slate-900">Book {worker?.name}</h1>
        <p className="mt-1 text-sm capitalize text-slate-500">
          {worker?.jobType} · ₹{worker?.dailyRate}/day
        </p>

        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label">Start date & time</label>
            <input
              type="datetime-local"
              required
              min={minDt}
              className="field"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-400">Bookings must be at least 24 hours in advance.</p>
          </div>
          <div>
            <label className="label">Number of days</label>
            <input
              type="number"
              min={1}
              max={30}
              required
              className="field"
              value={form.numberOfDays}
              onChange={(e) => setForm((f) => ({ ...f, numberOfDays: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              required
              rows={2}
              className="field"
              placeholder="Where should the worker come?"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              rows={2}
              className="field"
              placeholder="Anything the worker should know"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-500">Estimated total</span>
            <span className="text-lg font-bold text-slate-900">₹{total}</span>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
