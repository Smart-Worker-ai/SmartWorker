import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, X } from 'lucide-react';
import { bookingsApi, feedbackApi } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import StarRating from '../components/StarRating.jsx';

const pick = (b, ...keys) => keys.map((k) => b[k]).find((v) => v !== undefined);

function statusBadge(status = '') {
  const s = status.toLowerCase();
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-brand-100 text-brand-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-200 text-slate-500',
  };
  return map[s] || 'bg-slate-100 text-slate-600';
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setBookings(await bookingsApi.mine());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsApi.cancel(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <Spinner label="Loading your bookings…" />;

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-slate-900">My Bookings</h1>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
      {bookings.length === 0 ? (
        <p className="py-12 text-center text-slate-400">No bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const id = pick(b, 'id');
            const status = pick(b, 'status') || 'pending';
            const workerId = pick(b, 'workerId', 'worker_id');
            const workerName = pick(b, 'workerName', 'worker_name') || 'Worker';
            const date = pick(b, 'date');
            const days = pick(b, 'numberOfDays', 'number_of_days');
            const address = pick(b, 'address');
            const s = status.toLowerCase();
            return (
              <div key={id} className="card !p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{workerName}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays size={14} />
                      {date ? new Date(date).toLocaleString() : '—'} · {days} day(s)
                    </p>
                    {address && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin size={14} /> {address}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadge(status)}`}>
                    {status}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {(s === 'pending' || s === 'confirmed') && (
                    <button onClick={() => cancel(id)} className="btn-ghost !py-2 text-rose-600">
                      <X size={15} /> Cancel
                    </button>
                  )}
                  {s === 'completed' && <ReviewForm workerId={workerId} bookingId={id} onDone={load} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ workerId, bookingId, onDone }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await feedbackApi.submit({ workerId, bookingId, rating, comment: comment.trim() || undefined });
      setOpen(false);
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost !py-2">
        Leave a review
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-slate-200 p-3">
      <StarRating value={rating} size={22} onChange={setRating} />
      <textarea
        rows={2}
        className="field mt-2"
        placeholder="How was the work? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary !py-2">
          {busy ? 'Submitting…' : 'Submit'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost !py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
