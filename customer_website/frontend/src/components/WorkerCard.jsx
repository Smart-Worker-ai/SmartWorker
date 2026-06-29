import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, Briefcase } from 'lucide-react';
import StarRating from './StarRating.jsx';

export default function WorkerCard({ worker }) {
  return (
    <Link
      to={`/workers/${worker.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
          {worker.photoUrl ? (
            <img src={worker.photoUrl} alt={worker.name} className="h-full w-full object-cover" />
          ) : (
            worker.name?.[0]?.toUpperCase() || '?'
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="truncate font-semibold text-slate-900">{worker.name}</h3>
            {worker.isVerified && <BadgeCheck size={16} className="shrink-0 text-brand-600" />}
          </div>
          <p className="flex items-center gap-1 text-sm capitalize text-slate-500">
            <Briefcase size={13} /> {worker.jobType}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-slate-500">
          <MapPin size={13} /> {worker.town}, {worker.district}
        </span>
        <span className="font-semibold text-slate-900">₹{worker.dailyRate}/day</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StarRating value={worker.rating} size={14} />
          <span className="text-xs text-slate-500">({worker.totalReviews})</span>
        </div>
        <span className="text-xs text-slate-400">{worker.experienceYears} yrs exp</span>
      </div>
    </Link>
  );
}
