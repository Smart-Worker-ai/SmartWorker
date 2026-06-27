import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  User, Star, MapPin, Briefcase, Clock, LogOut,
  Copy, QrCode, Share2, CheckCheck, Gift, ChevronDown, ChevronUp,
  Hash,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} title="Copy" className={`transition-colors ${className}`}>
      {copied
        ? <CheckCheck className="w-4 h-4 text-green-400" />
        : <Copy className="w-4 h-4" />}
    </button>
  );
}

function ReferralSection({ worker, isDark }) {
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const loadReferral = async () => {
    if (referral) { setOpen(o => !o); return; }
    setLoading(true);
    setError('');
    try {
      const r = await axios.get('/api/workers/me/referral', { withCredentials: true });
      setReferral(r.data);
      setOpen(true);
    } catch {
      setError('Could not load referral info. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!referral) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Crewzo',
          text: 'Download the Crewzo customer app using my referral link!',
          url: referral.referral_link,
        });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(referral.referral_link);
    }
  };

  const card = isDark
    ? 'bg-gray-900 border-gray-800'
    : 'bg-white border-gray-100';

  return (
    <div className={`border rounded-2xl shadow-sm transition-colors duration-300 ${card}`}>
      {/* Header / toggle */}
      <button
        onClick={loadReferral}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Referral Program
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Earn credits by referring customers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {worker.referral_credits > 0 && (
            <span className="bg-violet-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {worker.referral_credits} credits
            </span>
          )}
          {loading
            ? <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            : open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && referral && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className={`px-6 pb-6 border-t space-y-5 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {[
                  { label: 'Total Referrals', value: referral.total_referrals ?? 0 },
                  { label: 'Credits Earned',  value: referral.referral_credits ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-xl p-3 text-center border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Referral link */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Your Referral Link
                </p>
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <span className={`flex-1 text-xs font-mono truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {referral.referral_link}
                  </span>
                  <CopyButton
                    text={referral.referral_link}
                    className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}
                  />
                  <button
                    onClick={share}
                    title="Share"
                    className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QR code */}
              {referral.qr_code ? (
                <div className="flex flex-col items-center gap-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <QrCode className="w-3.5 h-3.5 inline mr-1" />QR Code
                  </p>
                  <img
                    src={referral.qr_code}
                    alt="Referral QR Code"
                    className="w-40 h-40 rounded-xl border-4 border-white shadow-lg"
                  />
                  <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Let customers scan this to download the app
                  </p>
                </div>
              ) : (
                <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  QR code unavailable — share the link directly.
                </p>
              )}

              <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Each unique customer who downloads the app via your link earns you{' '}
                <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>1 referral credit</strong>.
                Credits are awarded once per device.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-red-500 text-xs px-6 pb-4">{error}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isDark, t, tStatus } = useTheme();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const legacy = localStorage.getItem('worker_token');
    const headers = legacy ? { Authorization: `Bearer ${legacy}` } : undefined;

    axios.get('/api/workers/me', { withCredentials: true, headers })
      .then(r => setWorker(r.data.worker))
      .catch(() => {
        localStorage.removeItem('worker_token');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', null, { withCredentials: true });
    } catch { /* noop */ }
    localStorage.removeItem('worker_token');
    navigate('/');
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="animate-spin w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  const statusColor = {
    pending:  isDark ? 'bg-yellow-900/40 text-yellow-300 ring-1 ring-yellow-800/60' : 'bg-yellow-100 text-yellow-800',
    approved: isDark ? 'bg-green-900/40 text-green-300 ring-1 ring-green-800/60'   : 'bg-green-100 text-green-800',
    rejected: isDark ? 'bg-red-900/40 text-red-300 ring-1 ring-red-800/60'         : 'bg-red-100 text-red-800',
  }[worker?.status] ?? (isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700');

  const card = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <nav className={`border-b px-6 h-14 flex items-center justify-between transition-colors duration-300
        ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <span className={`font-black ${isDark ? 'text-white' : 'text-brand-900'}`}>{t('Crewzo')}</span>
        <button onClick={logout} className={`flex items-center gap-1.5 text-sm transition-colors
          ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
          <LogOut className="w-4 h-4" /> {t('Logout')}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 border shadow-sm flex gap-5 items-start transition-colors duration-300 ${card}`}>
          {worker?.profile_photo ? (
            <img src={worker.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-brand-200 shrink-0" />
          ) : (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0
              ${isDark ? 'bg-gray-800' : 'bg-brand-100'}`}>
              <User className={`w-8 h-8 ${isDark ? 'text-brand-400' : 'text-brand-600'}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{worker?.name}</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t(worker?.job_type ?? '')} · ₹{worker?.daily_rate}{t('/day')}
            </p>
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-2 ${statusColor}`}>
              {tStatus(worker?.status)}
            </span>

            {/* Worker UID badge */}
            {worker?.worker_uid && (
              <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border
                ${isDark ? 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                <Hash className="w-3 h-3" />
                {worker.worker_uid}
                <CopyButton
                  text={worker.worker_uid}
                  className={isDark ? 'text-indigo-400 hover:text-white ml-1' : 'text-indigo-400 hover:text-indigo-700 ml-1'}
                />
              </div>
            )}
          </div>
        </motion.div>

        {worker?.status === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className={`border rounded-2xl p-5 flex gap-3 transition-colors duration-300
              ${isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
            <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <div>
              <p className={`font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                {t('Verification Pending')}
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
                {t('Verification pending message')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Star,      label: t('Rating'),   value: worker?.total_reviews > 0 ? `${worker.rating}★` : t('New') },
            { icon: Briefcase, label: t('Reviews'),  value: worker?.total_reviews ?? 0 },
            { icon: MapPin,    label: t('District'), value: worker?.district },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className={`border rounded-xl p-4 text-center shadow-sm transition-colors duration-300
              ${card}`}>
              <Icon className="w-5 h-5 text-brand-500 mx-auto mb-1" />
              <div className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Referral section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <ReferralSection worker={worker} isDark={isDark} />
        </motion.div>

        {/* Details */}
        <div className={`border rounded-2xl p-6 shadow-sm space-y-3 transition-colors duration-300 ${card}`}>
          <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('Profile Details')}</h3>
          {[
            [t('Worker ID'),             worker?.worker_uid || '—'],
            [t('Mobile'),               worker?.mobile],
            [t('Email'),                worker?.email || t('— None specified —')],
            [t('Current Location'),     worker?.current_location],
            [t('Interested Locations'), worker?.interested_locations],
            [t('Experience'),           `${worker?.experience_years} ${t('year(s)')}`],
            [t('Facilities Requested'), worker?.facilities_requested || t('None')],
          ].map(([k, v]) => (
            <div key={k} className={`flex justify-between text-sm border-b pb-2
              ${isDark ? 'border-gray-800' : 'border-gray-50'}`}>
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{k}</span>
              <span className={`font-semibold text-right max-w-[60%] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
