import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MAX_WORKERS_PER_TRADE, WORKER_CATEGORIES } from '../data/workersData';

const BookingContext = createContext(null);

export const HYRAKU_WHATSAPP_PHONE = '916238476615';
export const HYRAKU_WHATSAPP_DISPLAY = '+91 62384 76615';

export function hyrakuWhatsAppUrl(text = '') {
  const base = `https://wa.me/${HYRAKU_WHATSAPP_PHONE}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function openHyrakuWhatsApp(text = '') {
  window.location.assign(hyrakuWhatsAppUrl(text));
}

export async function persistHyrakuEnquiry(payload) {
  try {
    const res = await fetch('/hyraku-api/public/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Map of trade id -> active crew count, or null when the API could not be reached. */
async function fetchAvailability() {
  try {
    const res = await fetch('/hyraku-api/public/availability');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.trades && typeof data.trades === 'object' ? data.trades : null;
  } catch {
    return null;
  }
}

export function BookingProvider({ children }) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [crewCounts, setCrewCounts] = useState({});
  const [availability, setAvailability] = useState(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAvailability().then((trades) => {
      if (!alive) return;
      setAvailability(trades);
      setAvailabilityLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Bookable count for a trade: roster size, capped at MAX_WORKERS_PER_TRADE. */
  function availableFor(catId) {
    if (!availabilityLoaded) return MAX_WORKERS_PER_TRADE;
    if (!availability) return 0;
    const roster = Number(availability[catId]) || 0;
    return Math.min(MAX_WORKERS_PER_TRADE, roster);
  }

  function tradeTotal(counts, catId) {
    return Object.entries(counts)
      .filter(([key]) => key.startsWith(`${catId}_`))
      .reduce((sum, [, n]) => sum + (n || 0), 0);
  }

  function updateCrewCount(key, delta) {
    const catId = key.slice(0, key.lastIndexOf('_'));
    setCrewCounts((prev) => {
      if (delta > 0 && tradeTotal(prev, catId) + delta > availableFor(catId)) return prev;
      const updated = Math.max(0, (prev[key] || 0) + delta);
      return { ...prev, [key]: updated };
    });
  }

  function setTeamPreset(catId) {
    const category = WORKER_CATEGORIES.find((c) => c.id === catId);
    if (!category) return;
    setCrewCounts((prev) => {
      const next = { ...prev };
      let remaining = availableFor(catId) - tradeTotal(next, catId);
      category.subRoles.forEach((role) => {
        if (remaining <= 0) return;
        const key = `${catId}_${role.id}`;
        next[key] = (next[key] || 0) + 1;
        remaining -= 1;
      });
      return next;
    });
  }

  const totalWorkers = useMemo(() => {
    return Object.values(crewCounts).reduce((sum, n) => sum + (n || 0), 0);
  }, [crewCounts]);

  const value = {
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    crewCounts,
    setCrewCounts,
    updateCrewCount,
    setTeamPreset,
    totalWorkers,
    availability,
    availabilityLoaded,
    availableFor,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

export function buildWhatsAppMessage(bookingData, crewCounts) {
  const refCode = 'HYR-' + Math.floor(10000 + Math.random() * 90000);
  const datesBlock =
    bookingData.selectedDatesList && bookingData.selectedDatesList.length > 0
      ? bookingData.selectedDatesList.map((d) => `  • ${d}`).join('\n')
      : `  • ${bookingData.bookingDate}`;
  const cleanPhone = bookingData.mobileNumber.replace(/^\+?91\s*/, '').trim();

  const workersLines = [];
  WORKER_CATEGORIES.forEach((cat) => {
    const activeRoles = cat.subRoles
      .map((role) => ({ ...role, count: crewCounts[`${cat.id}_${role.id}`] || 0 }))
      .filter((r) => r.count > 0);

    if (activeRoles.length > 0) {
      if (cat.id === 'general-workers') {
        const totalCatWorkers = activeRoles.reduce((s, r) => s + r.count, 0);
        workersLines.push(`  • Labourers (General Labour) - ${totalCatWorkers}`);
      } else if (cat.id === 'painter') {
        const totalCatWorkers = activeRoles.reduce((s, r) => s + r.count, 0);
        workersLines.push(`  • Painters (Painter) - ${totalCatWorkers}`);
      } else {
        const catDisplayName = cat.id === 'concrete-finisher' ? 'Cement Setter' : cat.shortName;
        workersLines.push(`  • ${catDisplayName}:`);
        activeRoles.forEach((r) => {
          const roleTitle = r.id === 'mason' ? 'Head Masons' : r.id === 'helper' ? 'Helpers' : r.name;
          workersLines.push(`    - ${roleTitle} - ${r.count}`);
        });
      }
    }
  });

  const workersBlock =
    workersLines.length > 0 ? workersLines.join('\n') : `  • Labourers (General Labour) - 1`;

  const message = `*HYRAKU- WORKER BOOKING REQUEST*
Reference ID: ${refCode}
--------------------------
*Customer Name:* ${bookingData.customerName}
*Phone:* +91 ${cleanPhone}
*Location:* ${bookingData.locality} , ${bookingData.town}
*Request type:* ${bookingData.bookingMode === 'flash' ? 'Flash (24-hour notice, 1 day)' : 'Standard'}
*Date for Work:*
${datesBlock}

*Selected Workers:*
${workersBlock}
--------------------------
_Sent via Hyraku Booking Portal_`;

  return { refCode, message, whatsappUrl: hyrakuWhatsAppUrl(message) };
}
