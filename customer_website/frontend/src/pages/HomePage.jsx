import { useEffect, useState } from 'react';
import { Search, Frown } from 'lucide-react';
import { workersApi } from '../api/client.js';
import WorkerCard from '../components/WorkerCard.jsx';
import Spinner from '../components/Spinner.jsx';

export default function HomePage() {
  const [filters, setFilters] = useState({ district: '', town: '', jobType: '' });
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(params = {}) {
    setLoading(true);
    setError('');
    try {
      // Only send non-empty filters.
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

  function onSearch(e) {
    e.preventDefault();
    load(filters);
  }

  return (
    <div>
      <section className="mb-8 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Book trusted local workers</h1>
        <p className="mx-auto mt-2 max-w-xl text-brand-100">
          Verified plumbers, electricians, cleaners and more across Kerala — booked in minutes.
        </p>
      </section>

      <form
        onSubmit={onSearch}
        className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <input
          className="field"
          placeholder="District"
          value={filters.district}
          onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Town"
          value={filters.town}
          onChange={(e) => setFilters((f) => ({ ...f, town: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Job type (e.g. plumber)"
          value={filters.jobType}
          onChange={(e) => setFilters((f) => ({ ...f, jobType: e.target.value }))}
        />
        <button type="submit" className="btn-primary">
          <Search size={16} /> Search
        </button>
      </form>

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
    </div>
  );
}
