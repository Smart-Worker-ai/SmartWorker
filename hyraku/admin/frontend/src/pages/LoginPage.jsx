import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setToken(data.token);
      if (data.need_setup) {
        const qrRes = await api.post('/auth/totp/qr', { token: data.token });
        setQr(qrRes.data.qr);
        setStep('setup');
      } else {
        setStep('totp');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/auth/totp/verify', { token, code });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-100 to-white px-4">
      <form onSubmit={step === 'password' ? login : verify} className="card w-full max-w-md space-y-4 p-8">
        <div className="font-display text-3xl font-black tracking-tight text-[#0091ea]">Admin hyraku</div>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        {step === 'password' && (
          <>
            <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
          </>
        )}
        {step === 'setup' && (
          <>
            <p className="text-sm text-slate-600">Scan this QR in Google Authenticator / Aegis, then enter the 6-digit code.</p>
            {qr && <img src={qr} alt="TOTP QR" className="mx-auto h-48 w-48 rounded-xl border border-sky-100" />}
            <input className="field tracking-[0.4em]" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verifying…' : 'Enable TOTP & enter'}</button>
          </>
        )}
        {step === 'totp' && (
          <>
            <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
            <input className="field tracking-[0.4em]" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verifying…' : 'Sign in'}</button>
          </>
        )}
      </form>
    </div>
  );
}
