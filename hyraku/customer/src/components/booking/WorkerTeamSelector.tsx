import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Minus, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Hammer,
  Layers,
  Sparkles,
  Paintbrush,
  Construction,
  PhoneCall,
  UserX
} from 'lucide-react';
import { MAX_WORKERS_PER_TRADE, WORKER_CATEGORIES } from '../../data/workersData';
import { WorkerCategory, CrewCounts } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface WorkerTeamSelectorProps {
  selectedCategory: WorkerCategory | 'all';
  onSelectCategoryFilter: (category: WorkerCategory | 'all') => void;
  crewCounts: CrewCounts;
  onUpdateCrewCount: (categoryKey: string, delta: number) => void;
  onSetTeamPreset: (catId: WorkerCategory) => void;
  onBack: () => void;
  onProceedToDates: () => void;
  selectedCity: string;
  availabilityLoaded: boolean;
  availableFor: (catId: WorkerCategory) => number;
}

export const WorkerTeamSelector: React.FC<WorkerTeamSelectorProps> = ({
  selectedCategory,
  onSelectCategoryFilter,
  crewCounts,
  onUpdateCrewCount,
  onBack,
  onProceedToDates,
  availabilityLoaded,
  availableFor,
}) => {
  const { t, language } = useLanguage();

  const isUnavailable = (catId: WorkerCategory) => availabilityLoaded && availableFor(catId) === 0;
  const noneAvailable = availabilityLoaded && WORKER_CATEGORIES.every((c) => isUnavailable(c.id));
  const tradeTotal = (catId: WorkerCategory) =>
    WORKER_CATEGORIES.find((c) => c.id === catId)!.subRoles.reduce(
      (sum, role) => sum + (crewCounts[`${catId}_${role.id}`] || 0),
      0
    );

  // Compute total workers and total cost
  let totalWorkers = 0;
  let totalDailyWage = 0;

  WORKER_CATEGORIES.forEach((cat) => {
    cat.subRoles.forEach((role) => {
      const key = `${cat.id}_${role.id}`;
      const count = crewCounts[key] || 0;
      totalWorkers += count;
      totalDailyWage += count * role.ratePerDay;
    });
  });

  const getCategoryIcon = (id: WorkerCategory) => {
    switch (id) {
      case 'general-workers':
        return Users;
      case 'concrete-finisher':
        return Hammer;
      case 'bricklayer':
        return Layers;
      case 'stone-setter':
        return Construction;
      case 'tiler':
        return Sparkles;
      case 'painter':
        return Paintbrush;
      default:
        return Users;
    }
  };

  const getCategoryTitle = (id: string, defaultName: string) => {
    if (language === 'ml') {
      switch (id) {
        case 'general-workers':
          return 'സാധാരണ നിർമ്മാണ തൊഴിലാളികൾ';
        case 'concrete-finisher':
          return 'കോൺക്രീറ്റ് ഫിനിഷർ / സിമന്റ് സെറ്റർ';
        case 'bricklayer':
          return 'കട്ടകെട്ട് മേസ്തിരി & ബ്ലോക്ക് വർക്കർ';
        case 'stone-setter':
          return 'സ്റ്റോൺ ബ്രേക്കർ / സ്റ്റോൺ സെറ്റർ';
        case 'tiler':
          return 'ടൈൽസ്, മാർബിൾ & ഗ്രാനൈറ്റ് പണിക്കാർ';
        case 'painter':
          return 'പെയിന്റിംഗ് & വാട്ടർപ്രൂഫിംഗ്';
        default:
          return defaultName;
      }
    }
    return defaultName;
  };

  const getTierTitle = (id: string, tier: string) => {
    if (language !== 'ml') return tier;
    switch (id) {
      case 'general-workers':
        return 'ലേബർ';
      case 'concrete-finisher':
        return 'സിമന്റ് സെറ്റർ';
      case 'bricklayer':
        return 'വാൾ ബിൽഡർ';
      case 'stone-setter':
        return 'സ്റ്റോൺ സെറ്റർ';
      case 'tiler':
        return 'ടൈലർ';
      case 'painter':
        return 'പെയിന്റർ';
      default:
        return tier;
    }
  };

  const getRoleTitle = (roleId: string, defaultName: string) => {
    if (language === 'ml') {
      switch (roleId) {
        case 'labour':
          return 'തൊഴിലാളികൾ (ലേബറേഴ്സ്)';
        case 'mason':
          return 'മേസ്തിരിമാർ (ഹെഡ് മേസൺസ്)';
        case 'helper':
          return 'സഹായികൾ (ഹെൽപ്പർമാർ)';
        default:
          return defaultName;
      }
    }
    return defaultName;
  };

  const visibleCategories =
    selectedCategory === 'all'
      ? WORKER_CATEGORIES
      : WORKER_CATEGORIES.filter((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 pb-36 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-4">
        
        {/* Trade Category Navigation Header (Zero swiping to right, completely vertical) */}
        <div className="bg-white rounded-2xl border border-sky-100 p-3.5 sm:p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase text-[#0091ea] tracking-wider block">
                {selectedCategory === 'all'
                  ? (language === 'ml' ? 'എല്ലാ വിഭാഗങ്ങളും' : 'All Trade Categories')
                  : (language === 'ml' ? 'തിരഞ്ഞെടുത്ത വിഭാഗം' : 'Selected Trade')}
              </span>
              <h2 className="text-sm sm:text-lg lg:text-xl font-extrabold text-slate-900 font-display">
                {selectedCategory === 'all'
                  ? (language === 'ml' ? 'എല്ലാ നിർമ്മാണ തൊഴിലാളികളും' : 'All Construction Trades')
                  : getCategoryTitle(
                      selectedCategory,
                      WORKER_CATEGORIES.find((c) => c.id === selectedCategory)?.shortName || ''
                    )}
              </h2>
            </div>

            {selectedCategory !== 'all' ? (
              <button
                type="button"
                onClick={() => onSelectCategoryFilter('all')}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0091ea] border border-sky-200 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                {language === 'ml' ? 'എല്ലാം കാണുക (6)' : 'View All Trades (6)'}
              </button>
            ) : (
              <span className="text-xs font-bold bg-sky-50 text-[#0091ea] border border-sky-200 px-2.5 py-1 rounded-full shrink-0">
                6 {language === 'ml' ? 'വിഭാഗങ്ങൾ' : 'Trades'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {language === 'ml'
              ? `ഒരു വിഭാഗത്തിൽ ഒരു ബുക്കിംഗിൽ പരമാവധി ${MAX_WORKERS_PER_TRADE} തൊഴിലാളികൾ.`
              : `Max ${MAX_WORKERS_PER_TRADE} workers per trade per booking.`}
          </p>

          {/* Quick Trade Selector Dropdown (Vertical, No Horizontal Swiping) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <label className="text-[11px] font-bold text-slate-500 shrink-0">
              {language === 'ml' ? 'വിഭാഗം:' : 'Show Trade:'}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategoryFilter(e.target.value as any)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0091ea] focus:border-[#0091ea] cursor-pointer"
            >
              <option value="all">
                {language === 'ml' ? 'എല്ലാ വിഭാഗങ്ങളും (All Trades - 6)' : 'All Trade Categories (6)'}
              </option>
              {WORKER_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryTitle(cat.id, cat.shortName)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {noneAvailable && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <UserX className="w-6 h-6 text-amber-600 shrink-0 hidden sm:block" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {language === 'ml' ? 'ഇപ്പോൾ തൊഴിലാളികൾ ലഭ്യമല്ല' : 'No workers available right now'}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {language === 'ml'
                    ? 'ദയവായി പിന്നീട് പരിശോധിക്കുക, അല്ലെങ്കിൽ ഞങ്ങളെ വിളിക്കുക.'
                    : 'Please check back soon, or call us and we will arrange a crew.'}
                </p>
              </div>
            </div>
            <a
              href="tel:+916238476615"
              className="inline-flex items-center gap-2 bg-white border border-amber-300 text-amber-900 px-4 py-2 rounded-xl font-bold text-xs shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              +91 62384 76615
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCategories.map((cat) => {
            const IconComponent = getCategoryIcon(cat.id);
            const unavailable = isUnavailable(cat.id);
            const available = availableFor(cat.id);
            const atLimit = tradeTotal(cat.id) >= available;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border p-4 sm:p-5 shadow-sm space-y-2.5 h-full ${
                  unavailable ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
                }`}
              >
                {/* Header: Compact circular icon + Title + Subtitle */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 shadow-sm ${
                      unavailable ? 'border-slate-200 bg-white text-slate-400' : 'border-sky-100 bg-sky-50/50 text-[#0091ea]'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm sm:text-base font-bold font-display leading-tight ${unavailable ? 'text-slate-500' : 'text-slate-900'}`}>
                      {getCategoryTitle(cat.id, cat.name)}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {getTierTitle(cat.id, cat.tier)}
                    </p>
                  </div>
                  {availabilityLoaded && Number.isFinite(available) && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        unavailable
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {unavailable
                        ? (language === 'ml' ? 'ലഭ്യമല്ല' : 'Not available')
                        : `${available} ${language === 'ml' ? 'ലഭ്യം' : 'available'}`}
                    </span>
                  )}
                </div>

                {unavailable ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3.5 py-4 text-center">
                    <UserX className="w-5 h-5 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 mt-1.5">
                      {language === 'ml' ? 'ഈ വിഭാഗത്തിൽ ഇപ്പോൾ തൊഴിലാളികൾ ലഭ്യമല്ല' : 'No workers available for this trade right now'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'ml' ? 'ദയവായി പിന്നീട് പരിശോധിക്കുക' : 'Please check back soon'}
                    </p>
                  </div>
                ) : (
                <>

                {/* Booking Fee banner (Compact) */}
                <div className="bg-[#f0f4fa] rounded-xl px-3.5 py-1.5 flex items-center justify-between">
                  <span className="text-slate-700 text-xs font-medium">
                    {t('booking_fee')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-400 font-semibold text-xs">
                      ₹85
                    </span>
                    <span className="text-[#059669] font-black text-xs tracking-wide">
                      {t('free_badge')}
                    </span>
                  </div>
                </div>

                {/* Stepper Rows: Compact sizing */}
                <div className="divide-y divide-slate-100">
                  {cat.subRoles.map((role) => {
                    const key = `${cat.id}_${role.id}`;
                    const count = crewCounts[key] || 0;

                    return (
                      <div
                        key={role.id}
                        className="py-2.5 flex items-center justify-between gap-3 first:pt-0.5 last:pb-0.5"
                      >
                        {/* Role label & subtitle */}
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-800">
                            {getRoleTitle(role.id, role.name)}{' '}
                            <span className="text-slate-600 font-semibold text-xs">
                              (₹{role.ratePerDay.toLocaleString()}{t('per_day')})
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            {t('role_shift_info')}
                          </p>
                        </div>

                        {/* Stepper: Ergonomic Touch Buttons for Mobile */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={count === 0}
                            onClick={() => onUpdateCrewCount(key, -1)}
                            className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation ${
                              count > 0
                                ? 'border-sky-200 bg-white text-slate-700 hover:bg-sky-50 shadow-sm'
                                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                            }`}
                            aria-label={`Decrease ${role.name}`}
                          >
                            <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
                          </button>

                          <span className="w-7 text-center text-base sm:text-sm font-black text-slate-900 font-display">
                            {count}
                          </span>

                          <button
                            type="button"
                            disabled={atLimit}
                            onClick={() => onUpdateCrewCount(key, 1)}
                            className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all active:scale-95 touch-manipulation ${
                              atLimit
                                ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                : 'border-sky-200 bg-white text-slate-700 hover:bg-sky-50 cursor-pointer shadow-sm'
                            }`}
                            aria-label={`Increase ${role.name}`}
                          >
                            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
                )}
              </div>
            );
          })}
        </div>

        {/* View All Trades button when single category is active */}
        {selectedCategory !== 'all' && (
          <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                {language === 'ml' ? 'മറ്റ് ജോലിക്കാരെയും വേണമെന്നുണ്ടോ?' : 'Need workers from other trades too?'}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'ml'
                  ? 'മറ്റ് വിഭാഗങ്ങളിലെ തൊഴിലാളികളെയും ഈ ബുക്കിംഗിൽ ചേർക്കാം'
                  : 'You can combine multiple trade categories in a single booking'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategoryFilter('all')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0091ea] hover:bg-[#0284c7] text-white font-bold text-xs transition-all shadow-sm cursor-pointer shrink-0"
            >
              {language === 'ml' ? 'എല്ലാ വിഭാഗങ്ങളും കാണുക (6)' : 'View All Trades (6)'}
            </button>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar (Compact) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg p-2.5 sm:p-3">
        <div className="mx-auto w-full max-w-6xl space-y-2 px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-2">
            {/* Back Button */}
            <button
              type="button"
              onClick={onBack}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('back_btn')}</span>
            </button>

            {/* Status Indicator */}
            {totalWorkers === 0 ? (
              <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">
                  {language === 'ml'
                    ? 'തുടരുന്നതിനായി തൊഴിലാളികളെ തിരഞ്ഞെടുക്കുക'
                    : 'Select at least 1 Worker to proceed'}
                </span>
              </div>
            ) : (
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-emerald-900 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{totalWorkers}</strong>{' '}
                    {language === 'ml' ? 'തൊഴിലാളികൾ' : 'Selected'}
                  </span>
                </div>
                <span className="text-slate-900 font-extrabold font-display">
                  ₹{totalDailyWage.toLocaleString()}{t('per_day')}
                </span>
              </div>
            )}
          </div>

          {/* Primary CTA Button */}
          <button
            type="button"
            disabled={totalWorkers === 0}
            onClick={onProceedToDates}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              totalWorkers > 0
                ? 'bg-[#0091ea] hover:bg-[#0284c7] active:bg-[#0369a1] text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{t('next_enter_details')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
