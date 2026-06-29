import { useEffect, useRef, useState } from 'react';
import {
  Search, Frown, Star, ShieldCheck, Clock, BadgeCheck,
  Wrench, Zap, Sparkles, Hammer, PaintRoller, Snowflake, Leaf, Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { workersApi } from '../api/client.js';
import WorkerCard from '../components/WorkerCard.jsx';
import Spinner from '../components/Spinner.jsx';

const CATEGORIES = [
  { label: 'Plumber', value: 'plumber', Icon: Wrench },
  { label: 'Electrician', value: 'electrician', Icon: Zap },
  { label: 'Cleaner', value: 'cleaner', Icon: Sparkles },
  { label: 'Carpenter', value: 'carpenter', Icon: Hammer },
  { label: 'Painter', value: 'painter', Icon: PaintRoller },
  { label: 'AC Repair', value: 'ac repair', Icon: Snowflake },
  { label: 'Gardener', value: 'gardener', Icon: Leaf },
  { label: 'Movers', value: 'movers', Icon: Truck },
];

const STEPS = [
  { n: 1, title: 'Find a worker', text: 'Search by job, town or district and compare verified pros.' },
  { n: 2, title: 'Book a slot', text: 'Pick a date at least a day ahead and share your address.' },
  { n: 3, title: 'Get it done', text: 'Your worker arrives on time. Pay and leave a review after.' },
];

export default function HomePage() {
  const [filters, setFilters] = useState({ district: '', town: '', jobType: '' });
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const resultsRef = useRef(null);

  async function load(params = {}) {
    setLoading(true);
    setError('');
    try {
      const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
      setWorkers(await workersApi.list(clean));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function scrollToResults() {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onSearch(e) {
    e.preventDefault();
    load(filters);
    scrollToResults();
  }

  function pickCategory(value) {
    const next = { ...filters, jobType: value };
    setFilters(next);
    load(next);
    scrollToResults();
  }

  return (
    <div className="-mt-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-4 pb-16 pt-14 text-white sm:rounded-b-[3rem]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Star size={13} className="fill-amber-300 text-amber-300" /> Trusted by households across Kerala
          </span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl"
          >
            Trusted local workers,<br className="hidden sm:block" /> booked in minutes
          </motion.h1>
          <p className="mx-auto mt-3 max-w-xl text-brand-50/90">
            Verified plumbers, electricians, cleaners and more — near you, ready when you are.
          </p>

          {/* Search */}
          <form
            onSubmit={onSearch}
            className="mx-auto mt-7 grid max-w-2xl grid-cols-1 gap-2 rounded-2xl bg-white p-2 text-slate-700 shadow-lg sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              className="rounded-xl px-3 py-3 text-sm outline-none placeholder:text-slate-400"
              placeholder="District"
              value={filters.district}
              onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))}
            />
            <input
              className="rounded-xl px-3 py-3 text-sm outline-none placeholder:text-slate-400 sm:border-l sm:border-slate-100"
              placeholder="Town or job type"
              value={filters.town}
              onChange={(e) => setFilters((f) => ({ ...f, town: e.target.value }))}
            />
            <button type="submit" className="btn-primary !rounded-xl !py-3">
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-10 max-w-6xl px-1">
        <h2 className="mb-4 text-center text-lg font-bold text-ink">Popular services</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map(({ label, value, Icon }) => (
            <button
              key={value}
              onClick={() => pickCategory(value)}
              className={`flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md ${
                filters.jobType === value ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={20} />
              </span>
              <span className="text-xs font-medium text-slate-600">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-14 max-w-6xl px-1">
        <h2 className="mb-6 text-center text-lg font-bold text-ink">How Crewzo works</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto mt-14 max-w-6xl px-1">
        <div className="grid grid-cols-1 gap-4 rounded-2xl bg-ink px-6 py-8 text-white sm:grid-cols-3">
          {[
            { Icon: BadgeCheck, title: 'Verified pros', text: 'Every worker is ID-verified before listing.' },
            { Icon: ShieldCheck, title: 'Secure & safe', text: 'Background-checked, rated by real customers.' },
            { Icon: Clock, title: 'On your schedule', text: 'Book ahead, reschedule or cancel any time.' },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="shrink-0 text-brand-400" />
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-white/70">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Results */}
      <section ref={resultsRef} className="mx-auto mt-14 max-w-6xl scroll-mt-24 px-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">
            {filters.jobType ? `${filters.jobType} near you` : 'Available workers'}
          </h2>
          {filters.jobType && (
            <button
              onClick={() => { const n = { ...filters, jobType: '' }; setFilters(n); load(n); }}
              className="text-sm font-medium text-brand-600"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <Spinner label="Finding workers…" />
        ) : error ? (
          <p className="rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-600">{error}</p>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <Frown size={32} />
            <p>No workers match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
