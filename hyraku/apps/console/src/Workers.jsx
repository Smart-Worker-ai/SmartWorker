import { useEffect, useState } from 'react';
import { api } from './api';

export default function Workers({ onToast }) {
  const [workers, setWorkers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState(null);

  async function load() {
    try {
      setWorkers(await api.workers(filter));
    } catch {
      /* poll retries */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [filter]);

  async function decide(w, status) {
    const reason =
      status === 'rejected'
        ? window.prompt('Why? This is sent to them on WhatsApp.', 'Your documents were not readable.')
        : undefined;
    if (status === 'rejected' && reason === null) return;

    setBusy(w.id);
    try {
      await api.workerStatus(w.id, status, reason);
      onToast(`${w.name} ${status} · notified on WhatsApp`);
      load();
    } catch (err) {
      onToast(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="section-head">
        <h2>Workers</h2>
        <span className="spacer" />
        <div className="seg">
          {[
            ['pending', 'Awaiting review'],
            ['approved', 'Approved'],
            ['rejected', 'Rejected'],
            ['all', 'All'],
          ].map(([v, label]) => (
            <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {workers.length === 0 && (
        <div className="empty">
          <strong>Nothing here</strong>
          {filter === 'pending'
            ? 'Register a worker in the WhatsApp panel and they will appear for review.'
            : 'No workers with this status.'}
        </div>
      )}

      {workers.map((w) => (
        <div key={w.id} className="wcard">
          <div className="wcard-top">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wcard-name">
                {w.name}{' '}
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {w.workerUid}
                </span>
              </div>
              <div className="wcard-meta">
                {w.tradeLabel} · ₹{w.dailyRate}/day · {w.experienceYears} years
                <br />
                {w.town}, {w.district} · travels to {w.serviceAreas}
                <br />
                {w.phone}
                {w.age ? ` · ${w.age}` : ''}
                {w.gender ? ` · ${w.gender}` : ''}
                {w.totalJobs > 0 ? ` · ${w.totalJobs} jobs done` : ''}
              </div>
            </div>
            <span className={`badge ${w.status}`}>{w.status}</span>
          </div>

          {w.documents.length > 0 && (
            <div className="docs">
              {w.documents.map((d) => (
                <a key={d.id} className="doc" href={d.url} target="_blank" rel="noreferrer">
                  {d.mimeType?.startsWith('image/') ? (
                    <img src={d.url} alt={d.kind} />
                  ) : (
                    <div className="ph">PDF</div>
                  )}
                  <div className="cap">{d.kind}</div>
                </a>
              ))}
            </div>
          )}

          {w.acceptedTerms && (
            <div className="consent">
              Terms {w.termsVersion} accepted{' '}
              {w.acceptedTermsAt ? new Date(w.acceptedTermsAt).toLocaleString('en-IN') : ''}
            </div>
          )}

          {w.statusReason && (
            <div className="consent" style={{ color: 'var(--signal)' }}>
              Reason: {w.statusReason}
            </div>
          )}

          {w.status === 'pending' && (
            <div className="actions">
              <button className="btn" disabled={busy === w.id} onClick={() => decide(w, 'approved')}>
                Approve
              </button>
              <button className="btn danger" disabled={busy === w.id} onClick={() => decide(w, 'rejected')}>
                Reject
              </button>
            </div>
          )}

          {w.status === 'approved' && (
            <div className="actions">
              <button className="btn ghost sm" disabled={busy === w.id} onClick={() => decide(w, 'suspended')}>
                Suspend
              </button>
            </div>
          )}

          {['rejected', 'suspended'].includes(w.status) && (
            <div className="actions">
              <button className="btn sm" disabled={busy === w.id} onClick={() => decide(w, 'approved')}>
                Approve now
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
