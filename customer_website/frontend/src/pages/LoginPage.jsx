import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, KeyRound, Lock } from 'lucide-react';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [mode, setMode] = useState('otp'); // 'otp' | 'password'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function finish(data) {
    login(data.token, data.user);
    navigate(from, { replace: true });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-xl font-bold text-slate-900">Sign in to HAYAKU</h1>
        <p className="mt-1 text-sm text-slate-500">Book and manage your workers.</p>

        <div className="mt-5 flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
          <button
            className={`flex-1 rounded-md py-2 ${mode === 'otp' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            onClick={() => { setMode('otp'); setError(''); }}
          >
            Email OTP
          </button>
          <button
            className={`flex-1 rounded-md py-2 ${mode === 'password' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
            onClick={() => { setMode('password'); setError(''); }}
          >
            Password
          </button>
        </div>

        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

        {mode === 'otp' ? (
          <OtpForm onError={setError} onDone={finish} busy={busy} setBusy={setBusy} />
        ) : (
          <PasswordForm onError={setError} onDone={finish} busy={busy} setBusy={setBusy} />
        )}
      </div>
    </div>
  );
}

function OtpForm({ onError, onDone, busy, setBusy }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);

  async function send(e) {
    e.preventDefault();
    onError('');
    setBusy(true);
    try {
      await authApi.sendOtp(email.trim());
      setSent(true);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    onError('');
    setBusy(true);
    try {
      onDone(await authApi.verifyOtp(email.trim(), otp.trim()));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={sent ? verify : send} className="mt-5 space-y-4">
      <div>
        <label className="label">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="email"
            required
            disabled={sent}
            className="field pl-9"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {sent && (
        <div>
          <label className="label">6-digit code (sent to your email)</label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              inputMode="numeric"
              maxLength={6}
              required
              className="field pl-9 tracking-[0.3em]"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Please wait…' : sent ? 'Verify & sign in' : 'Send code'}
      </button>
      {sent && (
        <button type="button" onClick={() => setSent(false)} className="w-full text-sm text-slate-500">
          Change email
        </button>
      )}
    </form>
  );
}

function PasswordForm({ onError, onDone, busy, setBusy }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    onError('');
    setBusy(true);
    try {
      const data = isRegister
        ? await authApi.registerEmail(form.email.trim(), form.password, form.name.trim())
        : await authApi.loginEmail(form.email.trim(), form.password);
      onDone(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      {isRegister && (
        <div>
          <label className="label">Name</label>
          <input required className="field" value={form.name} onChange={set('name')} />
        </div>
      )}
      <div>
        <label className="label">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
          <input type="email" required className="field pl-9" value={form.email} onChange={set('email')} />
        </div>
      </div>
      <div>
        <label className="label">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
          <input type="password" required className="field pl-9" value={form.password} onChange={set('password')} />
        </div>
        {isRegister && (
          <p className="mt-1 text-xs text-slate-400">
            Min 8 chars, with an uppercase letter, a number and a special character.
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={() => { setIsRegister((v) => !v); onError(''); }}
        className="w-full text-sm text-brand-600"
      >
        {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </form>
  );
}
