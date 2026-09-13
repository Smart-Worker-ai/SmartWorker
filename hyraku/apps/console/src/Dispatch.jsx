import { useEffect, useState } from 'react';
import { api } from './api';

// The dispatch queue.
//
// In an assign-by-hand model this screen is the business. Everything here is
// arranged around one action — pick the top candidate and move on — because the
// dispatcher's attention is the thing that limits throughput.

export default function Dispatch({ onToast }) {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('open');
  const [expanded, setExpanded] = useState(null);
  const [candidates, setCandidates] = useState({});
  const [askWorker, setAskWorker] = useState(false);
  const [busy, setBusy] = useState(null);

  async function load() {
    try {
      setJobs(await api.jobs(filter));
    } catch {
      /* poll retries */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [filter]);

  async function toggle(job) {
    if (expanded === job.id) return setExpanded(null);
    setExpanded(job.id);
    if (!candidates[job.id]) {
      const list = await api.candidates(job.id);
      setCandidates((c) => ({ ...c, [job.id]: list }));
    }
  }

  async function assign(job, cand) {
    setBusy(cand.workerId);
    try {
      await api.assign(job.id, { workerId: cand.workerId, responseRequired: askWorker });
      onToast(
        askWorker
          ? `Offer sent to ${cand.name} — waiting for them to accept`
          : `${cand.name} assigned · customer notified on WhatsApp`
      );
      setExpanded(null);
      setCandidates((c) => ({ ...c, [job.id]: undefined }));
      load();
    } catch (err) {
      onToast(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(job, status) {
    await api.jobStatus(job.id, status);
    onToast(`${job.refNo} marked ${status.replace('_', ' ')}`);
    load();
  }

  return (
    <div>
      <div className="section-head">
        <h2>Dispatch queue</h2>
        <span className="spacer" />
        <div className="seg">
          {[
            ['open', 'Needs a worker'],
            ['active', 'Assigned'],
            ['all', 'All'],
          ].map(([v, label]) => (
            <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {jobs.length === 0 && (
        <div className="empty">
          <strong>Nothing in the queue</strong>
          Book a job in the WhatsApp panel and it will appear here within a few seconds.
        </div>
      )}

      <div className="jobs">
        {jobs.map((job) => {
          const cands = candidates[job.id];
          const isOpen = expanded === job.id;
          const settled = ['confirmed', 'assigned', 'in_progress', 'completed'].includes(job.status);

          return (
            <div key={job.id} className={`job ${job.isUrgent && !settled ? 'urgent' : ''} ${settled ? 'settled' : ''}`}>
              <div className="job-main">
                <div className="job-id">{job.refNo}</div>

                <div className="job-body">
                  <div className="job-title">
                    {job.tradeLabel} — {job.town}
                  </div>
                  <div className="job-line">
                    {new Date(job.preferredDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    <span className="sep">·</span>
                    {job.durationDays === 1 ? '1 day' : `${job.durationDays} days`}
                    <span className="sep">·</span>
                    {job.district}
                  </div>
                  <div className="job-line">
                    {job.customer.name ?? 'Customer'} · {job.customer.phone}
                  </div>
                  <div className="job-line" style={{ color: 'var(--muted)' }}>{job.address}</div>
                  {job.notes && <div className="job-notes">“{job.notes}”</div>}

                  {job.assignment && (
                    <div className="job-line" style={{ marginTop: 6, fontWeight: 500 }}>
                      {job.assignment.status === 'proposed' ? 'Offered to' : 'Assigned to'}{' '}
                      {job.assignment.worker.name} ({job.assignment.worker.uid}) ·{' '}
                      {job.assignment.worker.phone}
                    </div>
                  )}
                </div>

                <div className="job-side">
                  {job.isUrgent && !settled && <span className="badge urgent">Urgent</span>}{' '}
                  <span className={`badge ${job.status === 'new' ? 'new' : job.status === 'confirmed' ? 'confirmed' : job.status === 'completed' ? 'done' : 'assigned'}`}>
                    {job.statusLabel}
                  </span>
                  <div className="ago">{timeAgo(job.createdAt)}</div>
                  <div style={{ marginTop: 9, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {!settled && (
                      <button className="btn sm" onClick={() => toggle(job)}>
                        {isOpen ? 'Close' : 'Assign'}
                      </button>
                    )}
                    {job.status === 'confirmed' && (
                      <button className="btn sm ghost" onClick={() => setStatus(job, 'completed')}>
                        Complete
                      </button>
                    )}
                    {settled && job.status !== 'completed' && (
                      <button className="btn sm ghost" onClick={() => toggle(job)}>
                        Reassign
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="candidates">
                  <div className="cand-head">
                    Suggested workers · ranked by trade, distance, rating and current load
                  </div>

                  {!cands && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Ranking…</div>}
                  {cands?.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      No approved {job.tradeLabel.toLowerCase()}s yet. Approve one in the Workers tab.
                    </div>
                  )}

                  {(cands ?? []).slice(0, 5).map((c, i) => {
                    const clash = c.reasons.includes('Already booked that day');
                    return (
                      <div key={c.workerId} className={`cand ${i === 0 && !clash ? 'best' : ''} ${clash ? 'clash' : ''}`}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div>
                            <span className="cand-name">{c.name}</span>{' '}
                            <span className="cand-uid">{c.workerUid}</span>
                          </div>
                          <div className="cand-meta">
                            {c.town}, {c.district} · {c.experienceYears}y experience ·{' '}
                            {c.totalReviews > 0 ? `${c.rating.toFixed(1)}★ (${c.totalReviews})` : 'no reviews yet'}
                            {c.activeJobs > 0 ? ` · ${c.activeJobs} active` : ''}
                          </div>
                          <div className="reasons">
                            {c.reasons.map((r) => (
                              <span key={r} className={`reason ${clash && r.startsWith('Already') ? 'warn' : ''}`}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="cand-rate" title="Team only — the customer never sees this. Pay is agreed on site.">
                          {c.usualDailyRate ? `~₹${c.usualDailyRate}` : '—'}
                        </div>
                        <button
                          className="btn sm"
                          disabled={busy === c.workerId}
                          onClick={() => assign(job, c)}
                        >
                          {busy === c.workerId ? '…' : 'Assign'}
                        </button>
                      </div>
                    );
                  })}

                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      checked={askWorker}
                      onChange={(e) => setAskWorker(e.target.checked)}
                    />
                    Ask the worker to accept first — the customer is only told once they do
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
