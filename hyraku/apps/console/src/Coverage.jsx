import { useEffect, useState } from 'react';
import { api } from './api';

// The launch decision, laid out.
//
// "Enough workers" is a per-trade question — a hundred painters and no plumber
// is not a launch — so trades are the first table. The district table answers
// the next question: where do workers already live, and who is waiting for us.

// A working threshold, not a rule. Enough that one sick day or one busy week
// does not leave a trade with nobody to send.
const READY_AT = 5;

export default function Coverage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => api.coverage().then(setData).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="empty">Loading coverage…</div>;

  const area = data.serviceDistricts.join(', ');
  const ready = data.trades.filter((t) => t.approved >= READY_AT).length;
  const recruiting = data.districts.filter((d) => !d.serviced && (d.workersWaiting > 0 || d.customersWaiting > 0));

  return (
    <div>
      <div className="section-head">
        <h2>Launch readiness — {area}</h2>
        <span className="spacer" />
        <span className="muted-note">
          {ready} of {data.trades.length} trades have {READY_AT}+ approved workers
        </span>
      </div>

      <div className="t-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Trade</th>
              <th className="num">Approved</th>
              <th className="num">To review</th>
              <th className="num">Live in {area}</th>
              <th className="num">Customers waiting</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.trades.map((t) => {
              const state = t.approved >= READY_AT ? 'ready' : t.approved > 0 ? 'thin' : 'none';
              return (
                <tr key={t.trade}>
                  <td className="strong">{t.label}</td>
                  <td className="num">{t.approved}</td>
                  <td className="num">{t.pending || '—'}</td>
                  <td className="num">{t.livingInServiceArea || '—'}</td>
                  <td className="num">{t.customersWaiting || '—'}</td>
                  <td>
                    <span className={`badge cov-${state}`}>
                      {state === 'ready' ? 'Ready' : state === 'thin' ? 'Thin' : 'No workers'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="stats" style={{ marginTop: 18 }}>
        <div className="stat">
          <div className="n">{data.waitlist.customersForLaunch}</div>
          <div className="l">Customers waiting for launch</div>
        </div>
        <div className="stat">
          <div className="n">{data.waitlist.customersOutsideArea}</div>
          <div className="l">Customers outside {area}</div>
        </div>
        <div className="stat">
          <div className="n">{data.waitlist.workersOutsideArea}</div>
          <div className="l">Workers who can't reach {area}</div>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 22 }}>
        <h2>Where workers live</h2>
        <span className="spacer" />
        <span className="muted-note">Workers can register from anywhere in Kerala</span>
      </div>

      <div className="t-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>District</th>
              <th className="num">Approved workers living here</th>
              <th className="num">To review</th>
              <th className="num">Workers waiting for work here</th>
              <th className="num">Customers waiting here</th>
            </tr>
          </thead>
          <tbody>
            {data.districts.map((d) => (
              <tr key={d.district} className={d.serviced ? 'row-live' : ''}>
                <td className="strong">
                  {d.district} {d.serviced && <span className="badge approved">Live</span>}
                </td>
                <td className="num">{d.workersLivingHere || '—'}</td>
                <td className="num">{d.pendingLivingHere || '—'}</td>
                <td className="num">{d.workersWaiting || '—'}</td>
                <td className="num">{d.customersWaiting || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recruiting.length > 0 && (
        <p className="muted-note" style={{ marginTop: 12 }}>
          Asked for us outside {area}: {recruiting.map((d) => d.district).join(', ')}. These are the
          candidates for the next district.
        </p>
      )}
    </div>
  );
}
