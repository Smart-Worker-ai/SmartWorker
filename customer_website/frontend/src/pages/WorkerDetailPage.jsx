import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, BadgeCheck, Briefcase, ArrowLeft } from 'lucide-react';
import { workersApi, feedbackApi } from '../api/client.js';
import StarRating from '../components/StarRating.jsx';
import Spinner from '../components/Spinner.jsx';

export default function WorkerDetailPage() {
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [w, fb] = await Promise.all([
          workersApi.get(id),
          feedbackApi.forWorker(id).catch(() => []),
        ]);
        setWorker(w);
        setReviews(Array.isArray(fb) ? fb : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner label="Loading worker…" />;
  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-600">{error}</p>;
  if (!worker) return null;

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Back to search
      </Link>

      <div className="card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {worker.photoUrl ? (
              <img src={worker.photoUrl} alt={worker.name} className="h-full w-full object-cover" />
            ) : (
              worker.name?.[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-bold text-slate-900">{worker.name}</h1>
              {worker.isVerified && <BadgeCheck size={20} className="text-brand-600" />}
            </div>
            <p className="mt-1 flex items-center gap-1.5 capitalize text-slate-500">
              <Briefcase size={15} /> {worker.jobType} · {worker.experienceYears} yrs experience
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-slate-500">
              <MapPin size={15} /> {worker.town}, {worker.district}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={worker.rating} />
              <span className="text-sm text-slate-500">
                {Number(worker.rating || 0).toFixed(1)} · {worker.totalReviews} reviews
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">₹{worker.dailyRate}</p>
            <p className="text-sm text-slate-400">per day</p>
            <Link to={`/workers/${worker.id}/book`} className="btn-primary mt-3">
              Book now
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r, i) => (
              <div key={r.id || i} className="card !p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">
                    {r.customerName || r.customer_name || 'Customer'}
                  </span>
                  <StarRating value={r.rating} size={14} />
                </div>
                {(r.comment) && <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
