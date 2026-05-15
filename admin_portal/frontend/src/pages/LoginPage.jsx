import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Sparkles } from 'lucide-react';
import api from '../api';

// ── Galaxy Canvas ──────────────────────────────────────────────────────────────
function GalaxyCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Stars
    const STAR_COUNT = 200;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
    }));

    // Shooting stars
    const shoots = [];
    let shootTimer = 0;

    function addShoot() {
      shoots.push({
        x: Math.random() * canvas.width * 0.6,
        y: Math.random() * canvas.height * 0.4,
        len: Math.random() * 80 + 60,
        alpha: 1,
        speed: Math.random() * 8 + 5,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      });
    }

    // Nebula blobs (pre-computed)
    const nebulae = [
      { x: 0.15, y: 0.25, r: 220, color: '99, 102, 241' },
      { x: 0.75, y: 0.65, r: 280, color: '59, 130, 246' },
      { x: 0.5, y: 0.1, r: 180, color: '139, 92, 246' },
      { x: 0.85, y: 0.2, r: 150, color: '236, 72, 153' },
    ];

    let t = 0;
    function draw() {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebulae
      nebulae.forEach(n => {
        const pulse = 1 + Math.sin(t * 0.008 + n.x * 10) * 0.05;
        const grd = ctx.createRadialGradient(
          n.x * canvas.width, n.y * canvas.height, 0,
          n.x * canvas.width, n.y * canvas.height, n.r * pulse
        );
        grd.addColorStop(0, `rgba(${n.color}, 0.12)`);
        grd.addColorStop(0.5, `rgba(${n.color}, 0.05)`);
        grd.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(n.x * canvas.width, n.y * canvas.height, n.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars
      stars.forEach(s => {
        s.twinkle += s.twinkleSpeed;
        const tw = Math.sin(s.twinkle) * 0.4 + 0.6;
        ctx.save();
        ctx.globalAlpha = s.alpha * tw;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Shooting stars
      shootTimer++;
      if (shootTimer > 120 + Math.random() * 80) {
        addShoot();
        shootTimer = 0;
      }
      for (let i = shoots.length - 1; i >= 0; i--) {
        const sh = shoots[i];
        const dx = Math.cos(sh.angle) * sh.speed;
        const dy = Math.sin(sh.angle) * sh.speed;
        ctx.save();
        ctx.globalAlpha = sh.alpha;
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - Math.cos(sh.angle) * sh.len, sh.y - Math.sin(sh.angle) * sh.len);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - Math.cos(sh.angle) * sh.len, sh.y - Math.sin(sh.angle) * sh.len);
        ctx.stroke();
        ctx.restore();
        sh.x += dx;
        sh.y += dy;
        sh.alpha -= 0.018;
        if (sh.alpha <= 0) shoots.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

// ── Login Page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      // Server sets `admin_session` (httpOnly) + `csrf_token` cookies.
      // We deliberately ignore data.token now — cookie-only is the new path.
      await api.post('/auth/login', { username, password });
      // Clear any stale legacy localStorage token from older builds.
      localStorage.removeItem('admin_token');
      navigate('/', { replace: true });
    } catch {
      setError('Invalid credentials. Check username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      <GalaxyCanvas />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-blue-600/30 rounded-3xl blur-2xl" />

          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                className="relative inline-flex mb-5"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-2 -right-2"
                >
                  <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/50">
                    <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                  </div>
                </motion.div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black text-white tracking-tight"
              >
                Admin Portal
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/50 mt-1.5 text-sm"
              >
                Smart Workers — Restricted Access
              </motion.p>
            </div>

            {/* Form */}
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="space-y-5"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/15 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-gray-900/70 border border-white/15 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 placeholder:text-white/30 transition-all text-sm font-medium autofill:bg-gray-900/70"
                  style={{ colorScheme: 'dark', caretColor: 'white' }}
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-900/70 border border-white/15 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 placeholder:text-white/30 transition-all text-sm font-medium pr-12 autofill:bg-gray-900/70"
                    style={{ colorScheme: 'dark', caretColor: 'white' }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all mt-2 shadow-lg shadow-indigo-500/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    Sign In Securely
                  </span>
                )}
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              </motion.button>
            </motion.form>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-white/25 text-xs mt-6"
            >
              © 2026 Smart Workers. Authorized access only.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
