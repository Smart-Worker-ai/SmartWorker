import { useCallback, useEffect, useState } from 'react';
import { api, clearKey, getKey, setKey } from './api';
import Dispatch from './Dispatch';
import Workers from './Workers';
import Coverage from './Coverage';

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getKey()));
  const [tab, setTab] = useState('dispatch');
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const onUnauth = () => setAuthed(false);
    window.addEventListener('hyraku:unauthorised', onUnauth);
    return () => window.removeEventListener('hyraku:unauthorised', onUnauth);
  }, []);

  const loadStats = useCallback(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadStats();
    const t = setInterval(loadStats, 4000);
    return () => clearInterval(t);
  }, [authed, loadStats]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }, []);

  async function toggleBookings() {
    const next = !stats?.bookingsOpen;
    const area = stats?.serviceDistricts?.join(', ') ?? 'the service area';
    const question = next
      ? `Open bookings in ${area}? Customers who message will be able to book straight away.`
      : `Close bookings? New customers will be offered a launch notification instead.`;
    if (!window.confirm(question)) return;

    setSwitching(true);
    try {
      await api.setBookingsOpen(next);
      showToast(next ? `Bookings are open in ${area}` : 'Bookings closed — pre-launch mode');
      loadStats();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSwitching(false);
    }
  }

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">
          <span className="mark">H</span> Hyraku
        </div>
        {stats && <span className="pill area">{stats.serviceDistricts?.join(', ')}</span>}
        <span className="spacer" />
        {stats && (
          <button
            className={`launch-switch ${stats.bookingsOpen ? 'on' : ''}`}
            onClick={toggleBookings}
            disabled={switching}
            title="Controls whether customers can book, or are offered a launch notification"
          >
            <span className="dot-ind" />
            {stats.bookingsOpen ? 'Bookings open' : 'Pre-launch · bookings closed'}
          </button>
        )}
        <button
          className="linkbtn"
          onClick={() => {
            clearKey();
            setAuthed(false);
          }}
        >
          Sign out
        </button>
      </div>

      <div className="admin">
        <div className="tabs">
          <button className={`tab ${tab === 'dispatch' ? 'active' : ''}`} onClick={() => setTab('dispatch')}>
            Dispatch
            {stats?.open > 0 && (
              <span className={`count ${stats.urgent > 0 ? 'hot' : ''}`}>{stats.open}</span>
            )}
          </button>
          <button className={`tab ${tab === 'workers' ? 'active' : ''}`} onClick={() => setTab('workers')}>
            Workers
            {stats?.pendingWorkers > 0 && <span className="count">{stats.pendingWorkers}</span>}
          </button>
          <button className={`tab ${tab === 'coverage' ? 'active' : ''}`} onClick={() => setTab('coverage')}>
            Coverage
          </button>
        </div>

        <div className="panel">
          {(tab === 'workers' || tab === 'dispatch') && stats && (
            <div className="stats">
              <div className="stat">
                <div className="n">{stats.pendingWorkers}</div>
                <div className="l">To review</div>
              </div>
              <div className="stat">
                <div className="n">{stats.approvedWorkers}</div>
                <div className="l">Approved workers</div>
              </div>
              <div className="stat">
                <div className="n">{stats.waitlist}</div>
                <div className="l">On waitlist</div>
              </div>
              <div className={`stat ${stats.urgent > 0 ? 'hot' : ''}`}>
                <div className="n">{stats.open}</div>
                <div className="l">Jobs need a worker</div>
              </div>
              <div className="stat">
                <div className="n">{stats.confirmed}</div>
                <div className="l">Jobs assigned</div>
              </div>
            </div>
          )}

          {tab === 'dispatch' && <Dispatch onToast={showToast} />}
          {tab === 'workers' && <Workers onToast={showToast} />}
          {tab === 'coverage' && <Coverage />}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { key } = await api.login(password);
      setKey(key);
      onDone();
    } catch {
      setError('That password is not right.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <h1>Hyraku Console</h1>
        <p>Dispatch and worker approvals.</p>
        {error && <div className="err">{error}</div>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
