import { useCallback, useEffect, useState } from 'react';
import { api, clearKey, getKey, setKey } from './api';
import Phone from './Phone';
import Dispatch from './Dispatch';
import Workers from './Workers';
import Website from './Website';

const DEFAULT_CUSTOMER = '+919846010001';

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getKey()));
  const [tab, setTab] = useState('website');
  const [phone, setPhone] = useState(DEFAULT_CUSTOMER);
  const [personas, setPersonas] = useState(null);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onUnauth = () => setAuthed(false);
    window.addEventListener('hyraku:unauthorised', onUnauth);
    return () => window.removeEventListener('hyraku:unauthorised', onUnauth);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const load = () => {
      api.personas().then(setPersonas).catch(() => {});
      api.stats().then(setStats).catch(() => {});
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [authed]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  }, []);

  async function deepLink(text) {
    setPhone(DEFAULT_CUSTOMER);
    await api.send({ phone: DEFAULT_CUSTOMER, text });
    showToast('Opened WhatsApp with the message prefilled →');
  }

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <div className="topbar">
        <div className="logo">
          <span className="mark">H</span> Hyraku
        </div>
        <span className="pill">beta</span>
        <span className="spacer" />
        <span className="meta">channel: simulator · no Meta account needed</span>
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

      <div className="split">
        <Phone phone={phone} personas={personas} onChangePhone={setPhone} />

        <div className="admin">
          <div className="tabs">
            <button className={`tab ${tab === 'website' ? 'active' : ''}`} onClick={() => setTab('website')}>
              Website
            </button>
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
          </div>

          <div className="panel">
            {tab !== 'website' && stats && (
              <div className="stats">
                <div className={`stat ${stats.urgent > 0 ? 'hot' : ''}`}>
                  <div className="n">{stats.open}</div>
                  <div className="l">Need a worker</div>
                </div>
                <div className="stat">
                  <div className="n">{stats.confirmed}</div>
                  <div className="l">Assigned</div>
                </div>
                <div className="stat">
                  <div className="n">{stats.pendingWorkers}</div>
                  <div className="l">To review</div>
                </div>
                <div className="stat">
                  <div className="n">{stats.approvedWorkers}</div>
                  <div className="l">Active workers</div>
                </div>
                <div className="stat">
                  <div className="n">{stats.customers}</div>
                  <div className="l">Customers</div>
                </div>
              </div>
            )}

            {tab === 'website' && <Website onDeepLink={deepLink} customerPhone={DEFAULT_CUSTOMER} />}
            {tab === 'dispatch' && <Dispatch onToast={showToast} />}
            {tab === 'workers' && <Workers onToast={showToast} />}
          </div>
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
        <div className="hint">beta password: hyraku</div>
      </form>
    </div>
  );
}
