import { WorkerTypeInfo } from '../types';
import { KOZHIKODE_TOWNS } from './keralaLocations';

/** Max workers of one trade on a single booking (all sub-roles combined). */
export const MAX_WORKERS_PER_TRADE = 50;

/** Fixed trade catalog. Actual crew is added in admin; availability comes from /hyraku-api/public/availability. */
export const WORKER_CATEGORIES: WorkerTypeInfo[] = [
  {
    id: 'general-workers',
    name: 'General Construction Labour',
    shortName: 'General Labour',
    tier: 'Labour',
    description: 'Manual site support, material handling, loading/unloading, debris clearance, and earth excavation assistance.',
    image: '/assets/workers/general_labour.png',
    allowedRoles: ['Labour'],
    baseRatePerDay: 1000,
    subRoles: [{ id: 'labour', name: 'Labourers', ratePerDay: 1000 }],
  },
  {
    id: 'concrete-finisher',
    name: 'Concrete Finisher / Cement Setter',
    shortName: 'Concrete Finisher / Cement Setter',
    tier: 'Mason & Helper',
    description: 'Screeding, surface leveling, foundation pouring, shuttering vibration, and durable smooth cement finishes.',
    image: '/assets/workers/cement_setter.png',
    allowedRoles: ['Mason', 'Helper'],
    baseRatePerDay: 1200,
    subRoles: [
      { id: 'mason', name: 'Head Masons', ratePerDay: 1200 },
      { id: 'helper', name: 'Helpers', ratePerDay: 1000 },
    ],
  },
  {
    id: 'bricklayer',
    name: 'Wall Bricklayer & AAC Block Mason',
    shortName: 'Wall Builder',
    tier: 'Mason & Helper',
    description: 'Precision red brick, fly ash block, AAC block bonding, mortar mixing, plumb line alignment, and lintels.',
    image: '/assets/workers/wall_builder.png',
    allowedRoles: ['Mason', 'Helper'],
    baseRatePerDay: 1200,
    subRoles: [
      { id: 'mason', name: 'Head Masons', ratePerDay: 1200 },
      { id: 'helper', name: 'Helpers', ratePerDay: 1000 },
    ],
  },
  {
    id: 'stone-setter',
    name: 'Stone Breaker / Stone Setter',
    shortName: 'Stone Breaker / Stone Setter',
    tier: 'Mason & Helper',
    description: 'Natural granite, laterite stone masonry, dressed stone claddings, retaining wall craftsmanship, and dry stone setting.',
    image: '/assets/workers/stone_breaker.png',
    allowedRoles: ['Mason', 'Helper'],
    baseRatePerDay: 1300,
    subRoles: [
      { id: 'mason', name: 'Head Masons', ratePerDay: 1300 },
      { id: 'helper', name: 'Helpers', ratePerDay: 1100 },
    ],
  },
  {
    id: 'tiler',
    name: 'Tiles, Marble & Granite Setter',
    shortName: 'Tiler',
    tier: 'Mason & Helper',
    description: 'Vitrified, ceramic, marble, and mosaic floor and wall laying with laser leveling, spacer precision, and epoxy grouting.',
    image: '/assets/workers/tiler.png',
    allowedRoles: ['Mason', 'Helper'],
    baseRatePerDay: 1200,
    subRoles: [
      { id: 'mason', name: 'Head Masons', ratePerDay: 1200 },
      { id: 'helper', name: 'Helpers', ratePerDay: 1000 },
    ],
  },
  {
    id: 'painter',
    name: 'Wall Painter & Waterproofing Expert',
    shortName: 'Painter',
    tier: 'Labour',
    description: 'Surface putty application, sanding, primer coating, weather-proof exterior painting, emulsion, and texture finishes.',
    image: '/assets/workers/painter.png',
    allowedRoles: ['Painter', 'Labour'],
    baseRatePerDay: 1200,
    subRoles: [{ id: 'painter', name: 'Painters / Labour', ratePerDay: 1200 }],
  },
];

export const MONTH_OPTIONS = [
  'November 2025',
  'December 2025',
  'January 2026',
  'February 2026',
  'March 2026',
];

export const LOCATION_OPTIONS = KOZHIKODE_TOWNS;
