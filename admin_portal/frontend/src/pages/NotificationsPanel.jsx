import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bell, User, CheckCircle, XCircle, AlertTriangle,
  Gift, Zap, Award, Shield, Activity, RefreshCw,
} from 'lucide-react';
import api from '../api';

// ── Event metadata map ────────────────────────────────────────────────────────
const EVENT_META = {
  registered:                  { icon: User,          color: 'text-blue-400',   bg: 'bg-blue-900/30',   label: 'New Registration' },
  approved:                    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-900/30',  label: 'Approved' },
  rejected:                    { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-900/30',    label: 'Rejected' },
  blocked:                     { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-900/30', label: 'Blocked' },
  unblocked:                   { icon: Shield,        color: 'text-teal-400',   bg: 'bg-teal-900/30',   label: 'Unblocked' },
  referral_qr_generated:       { icon: Gift,          color: 'text-violet-400', bg: 'bg-violet-900/30', label: 'QR Generated' },
  apk_downloaded_via_referral: { icon: Zap,           color: 'text-amber-400',  bg: 'bg-amber-900/30',  label: 'APK Download' },
  referral_credit_awarded:     { icon: Award,         color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Credit Awarded' },
};

function getEventMeta(type) {
  return EVENT_META[type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-800', label: type };
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

function EventItem({ event }) {
  const meta = getEventMeta(event.event_type);
  const Icon = meta.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors cursor-default"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-gray-200 leading-snug">
            {event.description || meta.label}
          </p>
          <span className="text-xs text-gray-600 shrink-0 mt-0.5">{fmtTime(event.created_at)}</span>
        </div>
        {event.worker_name && (
          <p className="text-xs text-gray-500 mt-0.5">
            {event.worker_name}
            {event.worker_uid && (
              <span className="ml-1.5 font-mono text-gray-600">{event.worker_uid}</span>
            )}
          </p>
        )}
        <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
      </div>
    </motion.div>
  );
}

export function useNotificationsBadge() {
  const [events, setEvents] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/workers/events', { params: { limit: 10 } });
      const incoming = r.data.events ?? [];
      if (events.length > 0 && incoming.length > 0) {
        const latestKnown = events[0]?.created_at;
        const newCount = incoming.filter(e => e.created_at > latestKnown).length;
        if (newCount > 0) setUnread(n => n + newCount);
      } else if (events.length === 0 && incoming.length > 0) {
        setEvents(incoming);
      }
    } catch { /* ignore */ }
  }, [events]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  return { unread, clearBadge: () => setUnread(0) };
}

export default function NotificationsPanel({ open, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/workers/events', { params: { limit: 50 } });
      const incoming = r.data.events ?? [];
      setEvents(incoming);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  // Load on first open
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Poll every 60 s when panel is closed to count new events for the badge
  useEffect(() => {
    if (open) return;
    const poll = async () => {
      try {
        const r = await api.get('/workers/events', { params: { limit: 10 } });
        const incoming = r.data.events ?? [];
        if (events.length > 0 && incoming.length > 0) {
          const latestKnown = events[0]?.created_at;
          const newCount = incoming.filter(e => e.created_at > latestKnown).length;
          if (newCount > 0) setUnread(n => n + newCount);
        }
      } catch { /* ignore */ }
    };
    const t = setInterval(poll, 60_000);
    return () => clearInterval(t);
  }, [open, events]);

  return (
    <>
      {/* Slide-in drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-gray-950 border-l border-gray-800 z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-black text-white text-sm">Activity Feed</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={load}
                    disabled={loading}
                    id="notifications-refresh"
                    title="Refresh"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={onClose}
                    id="notifications-close"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event list */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {loading && events.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm py-16">
                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    No events yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {events.map(ev => <EventItem key={ev.id} event={ev} />)}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-800 shrink-0">
                <p className="text-xs text-gray-600 text-center">
                  Showing last {events.length} events · auto-refreshes every 60s
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
