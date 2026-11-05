import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api.js';
import { encryptCredentials } from '../loginCrypto.js';
import HyrakuWordmark from '../HyrakuWordmark.jsx';

export function LoginBackdrop({ children, className = '' }) {
  return (
    <div className={`relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0b1f33] px-4 py-8 ${className}`}>
      <img
        src="/assets/hyraku-login-bg.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.35]"
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const sealed = await encryptCredentials(username, password);
      const { data } = await api.post('/auth/login', sealed);
      setPassword('');
      setShowPassword(false);
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
    <LoginBackdrop className="sm:px-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <form
          onSubmit={step === 'password' ? login : verify}
          className="card relative space-y-4 p-5 shadow-lg sm:p-8"
        >
          <div>
            <HyrakuWordmark className="h-8 sm:h-9 w-auto" />
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin</div>
          </div>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
          {step === 'password' && (
            <>
              <input className="field" placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <div className="relative">
                <input
                  className="field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
            </>
          )}
          {step === 'setup' && (
            <>
              <p className="text-sm text-slate-600">Scan this QR in Google Authenticator / Aegis, then enter the 6-digit code.</p>
              {qr && (
                <img
                  src={qr}
                  alt="TOTP QR"
                  className="mx-auto aspect-square h-auto w-full max-w-[min(13rem,70vw)] rounded-xl border border-sky-100"
                />
              )}
              <input className="field text-center tracking-[0.35em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} required />
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verifying…' : 'Enable TOTP & enter'}</button>
            </>
          )}
          {step === 'totp' && (
            <>
              <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
              <input className="field text-center tracking-[0.35em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} required />
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verifying…' : 'Sign in'}</button>
            </>
          )}
        </form>
      </div>
    </LoginBackdrop>
  );
}
