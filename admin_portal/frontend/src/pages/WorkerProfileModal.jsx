import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Hash, Phone, Mail, MapPin, Briefcase, Calendar,
  Star, CheckCircle, XCircle, Clock, Gift, TrendingUp,
  Activity, DollarSign, FileText, ExternalLink, ChevronDown, ChevronUp,
  Shield, AlertTriangle, Award, Zap,
} from 'lucide-react';
import api from '../api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_META = {
  registered:                { icon: User,         color: 'text-blue-400',   bg: 'bg-blue-900/30',   label: 'Registered' },
  approved:                  { icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-900/30',  label: 'Approved' },
  rejected:                  { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-900/30',    label: 'Rejected' },
  blocked:                   { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-900/30', label: 'Blocked' },
  unblocked:                 { icon: Shield,       color: 'text-teal-400',   bg: 'bg-teal-900/30',   label: 'Unblocked' },
  referral_qr_generated:     { icon: Gift,         color: 'text-violet-400', bg: 'bg-violet-900/30', label: 'QR Generated' },
  apk_downloaded_via_referral: { icon: Zap,        color: 'text-amber-400',  bg: 'bg-amber-900/30',  label: 'APK Download' },
  referral_credit_awarded:   { icon: Award,        color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Credit Awarded' },
};

function getEventMeta(type) {
  return EVENT_META[type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-800', label: type };
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function fmtDateOnly(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

// ── Sub-sections ─────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between text-sm py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-gray-500 text-xs font-medium">{label}</span>
      <span className={`text-gray-200 font-medium text-right max-w-[58%] text-xs truncate ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function Section({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-gray-500 text-xs text-center py-3">No events recorded.</p>;
  }
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {events.map(ev => {
        const meta = getEventMeta(ev.event_type);
        const Icon = meta.icon;
        return (
          <div key={ev.id} className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-200 font-medium">{ev.description || meta.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtDate(ev.created_at)}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DocLink({ label, url }) {
  if (!url) return <span className="text-gray-600 text-xs">Not uploaded</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-700/50 text-indigo-300 rounded-lg text-xs font-medium transition-colors">
      <FileText className="w-3.5 h-3.5" /> {label} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkerProfileModal({ workerId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    setError('');
    api.get(`/workers/${workerId}/profile`)
      .then(r => setProfile(r.data))
      .catch(() => setError('Failed to load worker profile.'))
      .finally(() => setLoading(false));
  }, [workerId]);

  const w = profile?.worker;
  const events = profile?.events ?? [];
  const earnings = profile?.earnings ?? {};
  const referral = profile?.referral ?? {};

  const statusBadge = {
    pending:  'bg-yellow-900/40 text-yellow-400',
    approved: 'bg-green-900/40 text-green-400',
    rejected: 'bg-red-900/40 text-red-400',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
          className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl my-8"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-black text-white">Worker Profile</h2>
            <button
              onClick={onClose}
              id="profile-modal-close"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {loading && (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-900/20 rounded-xl border border-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {w && (
              <>
                {/* Hero */}
                <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800">
                  {w.profile_photo ? (
                    <img src={w.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-700 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-white">{w.name}</h3>
                    <p className="text-sm text-gray-400">{w.job_type} · ₹{w.daily_rate}/day</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Worker UID badge */}
                      <span className="inline-flex items-center gap-1 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-mono font-semibold">
                        <Hash className="w-3 h-3" /> {w.worker_uid || '—'}
                      </span>
                      {/* Status badge */}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge[w.status] ?? 'bg-gray-800 text-gray-400'}`}>
                        {(w.status || 'pending').toUpperCase()}
                      </span>
                      {w.is_verified && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-400">
                          ✓ Verified
                        </span>
                      )}
                      {w.is_blocked && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-900/40 text-red-400">
                          ⊘ Blocked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <Section title="Basic Information" icon={User} color="bg-indigo-600">
                  <InfoRow label="Worker ID"          value={w.worker_uid} mono />
                  <InfoRow label="Internal ID"        value={w.id} mono />
                  <InfoRow label="Full Name"          value={w.name} />
                  <InfoRow label="Age"                value={w.age} />
                  <InfoRow label="Gender"             value={w.gender} />
                  <InfoRow label="Registration Date"  value={fmtDateOnly(w.created_at)} />
                  <InfoRow label="Status"             value={w.status} />
                  <InfoRow label="Verified"           value={w.is_verified ? 'Yes' : 'No'} />
                  <InfoRow label="Blocked"            value={w.is_blocked ? 'Yes' : 'No'} />
                  <InfoRow label="Address"            value={w.address} />
                  <InfoRow label="Current Location"   value={w.current_location} />
                  <InfoRow label="District"           value={w.district} />
                  <InfoRow label="Town"               value={w.town} />
                  <InfoRow label="Experience"         value={`${w.experience_years} yr(s)`} />
                  <InfoRow label="Interested Locations" value={w.interested_locations} />
                  <InfoRow label="Facilities Requested" value={w.facilities_requested || 'None'} />

                  {/* Contact sub-section */}
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="w-4 h-4 text-gray-500" /> {w.mobile}
                    </div>
                    {w.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Mail className="w-4 h-4 text-gray-500" /> {w.email}
                      </div>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents</p>
                    <div className="flex flex-wrap gap-2">
                      <DocLink label="Aadhaar" url={w.aadhar_photo} />
                      <DocLink label="Passbook" url={w.passbook_photo} />
                    </div>
                  </div>
                </Section>

                {/* Activity Info */}
                <Section title="Activity Information" icon={Activity} color="bg-emerald-600">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { label: 'Rating',        value: w.total_reviews > 0 ? `${w.rating} ★` : 'New' },
                      { label: 'Total Reviews', value: w.total_reviews },
                      { label: 'Daily Rate',    value: `₹${w.daily_rate}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
                        <div className="text-lg font-black text-white">{value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Earnings */}
                <Section title="Earnings Information" icon={DollarSign} color="bg-amber-600" defaultOpen={false}>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center mb-3">
                    <div className="text-2xl font-black text-white">₹{(earnings.total || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Earnings</div>
                  </div>
                  {Object.keys(earnings.by_period || {}).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(earnings.by_period).sort().reverse().map(([period, amt]) => (
                        <InfoRow key={period} label={period} value={`₹${amt.toLocaleString('en-IN')}`} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-2">No earnings recorded yet.</p>
                  )}
                </Section>

                {/* Referral Info */}
                <Section title="Referral Information" icon={Gift} color="bg-violet-600" defaultOpen={false}>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Total Referrals',  value: referral.total_referrals ?? 0 },
                      { label: 'APK Downloads',    value: referral.total_downloads ?? 0 },
                      { label: 'Credits Earned',   value: referral.referral_credits ?? 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-black text-white">{value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                  <InfoRow label="Worker UID (Referral ID)" value={referral.worker_uid} mono />
                </Section>

                {/* Activity Timeline */}
                <Section title="Activity History" icon={TrendingUp} color="bg-rose-600" defaultOpen={false}>
                  <EventTimeline events={events} />
                </Section>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
