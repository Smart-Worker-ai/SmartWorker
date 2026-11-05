export type WorkerCategory = string;

export type RoleType = 'Mason' | 'Helper' | 'Labour' | 'Painter' | 'Lead Mason';

export interface SubRoleConfig {
  id: string;
  name: string;
  ratePerDay: number;
}

export interface WorkerTypeInfo {
  id: WorkerCategory;
  name: string;
  shortName: string;
  tier: string; // e.g. "labour", "mason & Helper", etc.
  description: string;
  image: string;
  iconName?: string;
  allowedRoles: RoleType[];
  baseRatePerDay: number;
  subRoles: SubRoleConfig[];
}

export interface WorkerProfile {
  id: string;
  name: string;
  category: WorkerCategory;
  role: RoleType;
  age: number;
  experienceYears: number;
  origin: string;
  rating: number;
  reviewCount: number;
  available: boolean;
  dailyRate: number;
  image: string;
  skills: string[];
  completedJobs: number;
  badge?: string;
  languages: string[];
}

export type CrewCounts = Record<string, number>;

export interface BookingState {
  selectedCategory: WorkerCategory | 'all';
  crewCounts: CrewCounts;
  selectedMonth: string;
  location: string;
  startDate: number;
  durationDays: number;
}

export type AppView = 'landing' | 'select-workers' | 'select-dates' | 'confirm-summary';
