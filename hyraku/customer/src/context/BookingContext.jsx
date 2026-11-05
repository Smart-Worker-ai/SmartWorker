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

function mergeCatalog(apiCatalog) {
  if (!Array.isArray(apiCatalog) || !apiCatalog.length) return WORKER_CATEGORIES;
  return apiCatalog.map((item) => {
    const base = WORKER_CATEGORIES.find((c) => c.id === item.id) || {};
    return {
      ...base,
      id: item.id,
      name: item.name || base.name || item.id,
      shortName: item.shortName || item.name || base.shortName || item.id,
      tier: item.tier || base.tier || 'Labour',
      description: base.description || '',
      image: base.image || '/assets/workers/general_labour.png',
      allowedRoles: base.allowedRoles || ['Labour'],
      baseRatePerDay: item.baseRatePerDay || base.baseRatePerDay || 1000,
      subRoles: item.subRoles?.length
        ? item.subRoles
        : (base.subRoles || [{ id: 'labour', name: 'Labourers', ratePerDay: 1000 }]),
    };
  });
}

async function fetchAvailability() {
  try {
    const res = await fetch('/hyraku-api/public/availability');
    if (!res.ok) return null;
    const data = await res.json();
    return {
      map: data?.trades && typeof data.trades === 'object' ? data.trades : null,
      catalog: mergeCatalog(data?.catalog),
    };
  } catch {
    return null;
  }
}

export function BookingProvider({ children }) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [crewCounts, setCrewCounts] = useState({});
  const [availability, setAvailability] = useState(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState(WORKER_CATEGORIES);

  useEffect(() => {
    let alive = true;
    fetchAvailability().then((payload) => {
      if (!alive) return;
      setAvailability(payload?.map ?? null);
      if (payload?.catalog?.length) setCatalogCategories(payload.catalog);
      setAvailabilityLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  function isTradeOpen(catId) {
    if (!availabilityLoaded || !availability) return true;
    const v = availability[catId];
    if (typeof v === 'boolean') return v;
    if (v && typeof v === 'object' && 'available' in v) return !!v.available;
    return true;
  }

  function availableFor(catId) {
    return isTradeOpen(catId) ? MAX_WORKERS_PER_TRADE : 0;
  }

  function tradeTotal(counts, catId) {
    return Object.entries(counts)
      .filter(([key]) => key.startsWith(`${catId}_`))
      .reduce((sum, [, n]) => sum + (n || 0), 0);
  }

  function clampRoleCount(prev, key, wanted) {
    const catId = key.slice(0, key.lastIndexOf('_'));
    const others = tradeTotal(prev, catId) - (prev[key] || 0);
    const room = Math.max(0, MAX_WORKERS_PER_TRADE - others);
    const n = Math.floor(Number(wanted));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, room);
  }

  function updateCrewCount(key, delta) {
    setCrewCounts((prev) => {
      const updated = clampRoleCount(prev, key, (prev[key] || 0) + delta);
      return { ...prev, [key]: updated };
    });
  }

  function setCrewCount(key, value) {
    setCrewCounts((prev) => ({ ...prev, [key]: clampRoleCount(prev, key, value) }));
  }

  function setTeamPreset(catId) {
    const category = catalogCategories.find((c) => c.id === catId);
    if (!category) return;
    setCrewCounts((prev) => {
      const next = { ...prev };
      category.subRoles.forEach((role) => {
        const key = `${catId}_${role.id}`;
        next[key] = clampRoleCount(next, key, (next[key] || 0) + 1);
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
    setCrewCount,
    setTeamPreset,
    totalWorkers,
    availability,
    availabilityLoaded,
    availableFor,
    isTradeOpen,
    catalogCategories,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

export function buildWhatsAppMessage(bookingData, crewCounts, catalog = WORKER_CATEGORIES) {
  const refCode = 'HYR-' + Math.floor(10000 + Math.random() * 90000);
  const datesBlock =
    bookingData.selectedDatesList && bookingData.selectedDatesList.length > 0
      ? bookingData.selectedDatesList.map((d) => `  • ${d}`).join('\n')
      : `  • ${bookingData.bookingDate}`;
  const cleanPhone = bookingData.mobileNumber.replace(/^\+?91\s*/, '').trim();

  const workersLines = [];
  const cats = catalog?.length ? catalog : WORKER_CATEGORIES;
  cats.forEach((cat) => {
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
*Date for Work:*
${datesBlock}

*Selected Workers:*
${workersBlock}
--------------------------
_Sent via Hyraku Booking Portal_`;

  return { refCode, message, whatsappUrl: hyrakuWhatsAppUrl(message) };
}
