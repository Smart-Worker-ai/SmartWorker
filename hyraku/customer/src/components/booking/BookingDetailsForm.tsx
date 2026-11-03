import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Check,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  MapPin
} from 'lucide-react';
import { WORKER_CATEGORIES } from '../../data/workersData';
import { KOZHIKODE_TOWNS, getLocalitiesForTown } from '../../data/keralaLocations';

import { CrewCounts, WorkerCategory } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { dateKey, getAdvanceMonths, nextWorkDates } from '../../lib/bookingCalendar';

interface BookingDetailsFormProps {
  crewCounts: CrewCounts;
  selectedCategory: WorkerCategory | 'all';
  onBack: () => void;
  onSubmitBooking: (bookingData: CustomerBookingData) => void;
}

export interface CustomerBookingData {
  customerName: string;
  town: string;
  locality: string;
  mobileNumber: string;
  bookingDate: string;
  selectedDatesList: string[];
  totalWorkers: number;
  totalDailyWage: number;
  crewSummaryText: string;
}

const FOUR_ADVANCE_MONTHS = getAdvanceMonths(4);

export const BookingDetailsForm: React.FC<BookingDetailsFormProps> = ({
  crewCounts,
  selectedCategory,
  onBack,
  onSubmitBooking,
}) => {
  const { t, language } = useLanguage();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [town, setTown] = useState('Kozhikode');
  const availableLocalities = getLocalitiesForTown(town);
  const [locality, setLocality] = useState(availableLocalities[0] || 'Elathur');
  const [isCustomLocality, setIsCustomLocality] = useState(false);
  const [customLocalityText, setCustomLocalityText] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [formError, setFormError] = useState('');

  // Handle town change - automatically switch correspondent localities
  const handleTownChange = (newTown: string) => {
    setTown(newTown);
    const newLocs = getLocalitiesForTown(newTown);
    if (!isCustomLocality) {
      setLocality(newLocs[0] || '');
    }
  };

  // Handle locality change
  const handleLocalitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomLocality(true);
      setLocality(customLocalityText);
    } else {
      setIsCustomLocality(false);
      setLocality(val);
    }
  };


  // 4 Month Advance Calendar State (Inline direct interactive selector)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    const month = FOUR_ADVANCE_MONTHS[0];
    const presets = nextWorkDates(month);
    return [dateKey(presets.tomorrow, month)];
  });

  // Compute selected worker details & summary text
  let totalWorkers = 0;
  let totalDailyWage = 0;
  const workerSummaryItems: string[] = [];

  WORKER_CATEGORIES.forEach((cat) => {
    cat.subRoles.forEach((role) => {
      const key = `${cat.id}_${role.id}`;
      const count = crewCounts[key] || 0;
      if (count > 0) {
        totalWorkers += count;
        totalDailyWage += count * role.ratePerDay;
        const roleName = language === 'ml'
          ? (role.id === 'labour' ? 'തൊഴിലാളികൾ' : role.id === 'mason' ? 'മേസ്തിരി' : 'സഹായി')
          : role.name;
        workerSummaryItems.push(`${count}x ${roleName}`);
      }
    });
  });

  const displaySelectedWorkers = workerSummaryItems.length > 0
    ? workerSummaryItems.join(', ')
    : selectedCategory !== 'all'
    ? WORKER_CATEGORIES.find((c) => c.id === selectedCategory)?.shortName || 'Workers'
    : (language === 'ml' ? 'നിർമ്മാണ തൊഴിലാളികൾ' : 'Skilled Labour Crew');

  // Toggle or select a date in the calendar
  const handleToggleDate = (day: number) => {
    const activeMonth = FOUR_ADVANCE_MONTHS[selectedMonthIndex];
    const key = dateKey(day, activeMonth);

    setSelectedDates((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== key);
      }
      return [...prev, key];
    });
  };

  const handleSelectQuickPreset = (preset: 'tomorrow' | 'in2days' | 'nextMonday') => {
    const activeMonth = FOUR_ADVANCE_MONTHS[selectedMonthIndex];
    const presets = nextWorkDates(activeMonth);
    setSelectedDates([dateKey(presets[preset], activeMonth)]);
  };

  const formattedDateDisplay = selectedDates.length > 0
    ? selectedDates.join(', ')
    : (language === 'ml' ? 'ജോലി തീയതി തിരഞ്ഞെടുക്കുക' : 'Select date for work');

  // Current month calendar grid
  const currentMonth = FOUR_ADVANCE_MONTHS[selectedMonthIndex];
  const calendarSlots = [];
  for (let i = 0; i < currentMonth.startDayOffset; i++) {
    calendarSlots.push(null);
  }
  for (let day = 1; day <= currentMonth.daysInMonth; day++) {
    calendarSlots.push(day);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalLocality = isCustomLocality ? (customLocalityText.trim() || locality) : locality;
    const name = customerName.trim();
    const phone = mobileNumber.replace(/\D/g, '');
    const nameOk = name.length >= 2 && name.length <= 80 && /^\p{L}/u.test(name) && [...name].every((ch) => /\p{L}/u.test(ch) || " .'-".includes(ch));
    if (!nameOk) {
      setFormError(language === 'ml' ? 'സാധുവായ പേര് നൽകുക (2–80 അക്ഷരങ്ങൾ).' : 'Enter a valid name (2–80 letters).');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setFormError(language === 'ml' ? 'സാധുവായ 10 അക്ക ഇന്ത്യൻ മൊബൈൽ നമ്പർ നൽകുക.' : 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!finalLocality.trim()) {
      setFormError(language === 'ml' ? 'സ്ഥലം നൽകുക.' : 'Enter a locality.');
      return;
    }
    setFormError('');

    const bookingPayload: CustomerBookingData = {
      customerName: name,
      town,
      locality: finalLocality,
      mobileNumber: phone,
      bookingDate: formattedDateDisplay,
      selectedDatesList: selectedDates.length > 0 ? selectedDates : [formattedDateDisplay],
      totalWorkers: totalWorkers || 1,
      totalDailyWage,
      crewSummaryText: displaySelectedWorkers,
    };

    onSubmitBooking(bookingPayload);
  };


  const daysOfWeek = language === 'ml'
    ? ['ഞാ', 'തി', 'ചൊ', 'ബു', 'വ്യാ', 'വെ', 'ശ']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Step Title & Subtitle */}
        <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold text-[#0091ea] tracking-wider uppercase">
              {language === 'ml' ? 'ഘട്ടം 2 / 2' : 'STEP 2 OF 2'}
            </span>
            <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {language === 'ml' ? 'ബുക്കിംഗ് അഭ്യർത്ഥന' : 'Booking Request'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
            {t('booking_details_title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {t('booking_details_subtitle')}
          </p>
        </div>

        {/* Clear Notice: Booking is a Request, Confirmed ONLY after WhatsApp verification */}
        <div className="bg-gradient-to-r from-amber-50/90 to-sky-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-2 text-xs shadow-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950 block">
                {language === 'ml'
                  ? 'പ്രധാനപ്പെട്ട അറിയിപ്പ്: ഇത് ബുക്കിംഗ് അഭ്യർത്ഥനയാണ്'
                  : 'Important: Booking Request Process'}
              </span>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                {language === 'ml'
                  ? 'തീയതികൾ തിരഞ്ഞെടുത്ത് അയക്കുന്നത് ബുക്കിംഗ് അഭ്യർത്ഥന മാത്രമാണ്. ഈ തീയതികളിലെ തൊഴിലാളി ലഭ്യത ഹൈറാകു പരിശോധിച്ച ശേഷം WhatsApp വഴി ഔദ്യോഗിക സ്ഥിരീകരണ സന്ദേശം അയക്കുമ്പോൾ മാത്രമേ ബുക്കിംഗ് ഉറപ്പാകൂ.'
                  : 'Selecting a date submits a booking request, not an instant confirmation. Hyraku will review worker availability, and confirmation happens ONLY when our team delivers a confirmation message to you on WhatsApp.'}
              </p>
            </div>
          </div>

          {/* 3 Step Timeline Indicator */}
          <div className="pt-1.5 border-t border-amber-200/60 grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="bg-white/80 border border-amber-200/80 rounded-lg p-1.5">
              <div className="font-extrabold text-slate-800">1. {language === 'ml' ? 'അഭ്യർത്ഥന' : 'Request'}</div>
              <div className="text-[9px] text-slate-500">{language === 'ml' ? 'WhatsApp-ലേക്ക്' : 'Sent to WhatsApp'}</div>
            </div>
            <div className="bg-white/80 border border-amber-200/80 rounded-lg p-1.5">
              <div className="font-extrabold text-amber-800">2. {language === 'ml' ? 'ലഭ്യത' : 'Availability'}</div>
              <div className="text-[9px] text-amber-700">{language === 'ml' ? 'ഹൈറാകു പരിശോധന' : 'Hyraku Checks'}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-1.5">
              <div className="font-extrabold text-emerald-800">3. {language === 'ml' ? 'സ്ഥിരീകരണം' : 'Confirmed'}</div>
              <div className="text-[9px] text-emerald-700">{language === 'ml' ? 'WhatsApp സന്ദേശം' : 'Via WhatsApp Msg'}</div>
            </div>
          </div>
        </div>

        {/* Selected Worker(s) pill card */}
        <div className="bg-sky-50/80 border border-sky-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0091ea]" />
            <span className="font-semibold text-slate-700">
              {language === 'ml' ? 'ആവശ്യപ്പെട്ട തൊഴിലാളികൾ:' : 'Requested Crew:'}
            </span>
          </div>
          <span className="font-extrabold text-[#0091ea] text-right truncate max-w-[60%] font-display">
            {displaySelectedWorkers}
          </span>
        </div>

        {/* Form Container Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-6 lg:p-8 shadow-sm space-y-5 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
          
          <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              {language === 'ml' ? 'പൂർണ്ണ പേര് *' : 'FULL NAME *'}
            </label>
            <input
              type="text"
              required
              value={customerName}
              maxLength={80}
              onChange={(e) => { setCustomerName(e.target.value); setFormError(''); }}
              placeholder={t('client_name_placeholder')}
              className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0091ea] focus:border-[#0091ea] focus:bg-white transition-all"
            />
          </div>

          {/* Town & Locality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>{language === 'ml' ? 'നഗരം / ടൗൺ *' : 'TOWN *'}</span>
                <span className="text-[10px] text-[#0091ea] font-medium lowercase">
                  ({KOZHIKODE_TOWNS.length} {language === 'ml' ? 'ടൗണുകൾ' : 'towns'})
                </span>
              </label>
              <div className="relative">
                <select
                  value={town}
                  onChange={(e) => handleTownChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50/60 border border-slate-200 rounded-xl pl-3.5 pr-10 py-3 text-base sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0091ea] focus:border-[#0091ea] focus:bg-white transition-all cursor-pointer font-medium"
                >
                  {KOZHIKODE_TOWNS.map((tName) => (
                    <option key={tName} value={tName}>
                      {tName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>{language === 'ml' ? 'സ്ഥലം / പ്രദേശം *' : 'LOCALITY / AREA *'}</span>
                <span className="text-[10px] text-[#0091ea] font-medium">
                  {availableLocalities.length} {language === 'ml' ? 'സ്ഥലങ്ങൾ' : 'areas'}
                </span>
              </label>

              {!isCustomLocality ? (
                <div className="relative">
                  <select
                    value={locality}
                    onChange={handleLocalitySelectChange}
                    className="w-full appearance-none bg-slate-50/60 border border-slate-200 rounded-xl pl-3.5 pr-10 py-3 text-base sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0091ea] focus:border-[#0091ea] focus:bg-white transition-all cursor-pointer font-medium"
                  >
                    {availableLocalities.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="__custom__">
                      {language === 'ml' ? '+ മറ്റ് സ്ഥലം ടൈപ്പ് ചെയ്യുക...' : '+ Other / Enter Custom Locality...'}
                    </option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={customLocalityText}
                    onChange={(e) => {
                      setCustomLocalityText(e.target.value);
                      setLocality(e.target.value);
                    }}
                    placeholder={language === 'ml' ? 'സ്ഥലത്തിന്റെ പേര് നൽകുക' : 'Enter your locality / area name'}
                    className="w-full bg-slate-50/60 border border-[#0091ea] rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0091ea] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomLocality(false);
                      setLocality(availableLocalities[0] || 'Elathur');
                    }}
                    className="text-[11px] text-[#0091ea] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    ← {language === 'ml' ? `${town}-ലെ പട്ടികയിലേക്ക് മടങ്ങുക` : `Back to ${town} list`}
                  </button>
                </div>
              )}
            </div>
          </div>


          {/* Phone Number */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              {language === 'ml' ? 'ഫോൺ നമ്പർ *' : 'PHONE NUMBER *'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-400 select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                value={mobileNumber}
                onChange={(e) => { setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setFormError(''); }}
                placeholder={t('phone_placeholder')}
                className="w-full bg-slate-50/60 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0091ea] focus:border-[#0091ea] focus:bg-white transition-all"
              />
            </div>
          </div>
          </div>

          <div className="space-y-5 lg:border-l lg:border-slate-100 lg:pl-8">
          {/* Date for Work Option (Redesigned Direct Interactive Experience) */}
          <div className="pt-2 border-t border-slate-100 lg:border-t-0 lg:pt-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#0091ea]" />
                <span>
                  {language === 'ml'
                    ? 'ആവശ്യമായ ജോലി തീയതി (ലഭ്യതയ്ക്കനുസരിച്ച്) *'
                    : 'REQUESTED WORK DATES (SUBJECT TO AVAILABILITY) *'}
                </span>
              </label>

              {selectedDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  className="text-[10px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{language === 'ml' ? 'മാറ്റുക' : 'Reset'}</span>
                </button>
              )}
            </div>

            {/* Quick Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => handleSelectQuickPreset('tomorrow')}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold text-[#0091ea] whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                {language === 'ml' ? 'നാളെ' : 'Tomorrow'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickPreset('in2days')}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold text-[#0091ea] whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                {language === 'ml' ? '2 ദിവസത്തിനകം' : 'In 2 Days'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickPreset('nextMonday')}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold text-[#0091ea] whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                {language === 'ml' ? 'അടുത്ത തിങ്കൾ' : 'Next Monday'}
              </button>
            </div>

            {/* Direct Inline Calendar Card (No modal barrier!) */}
            <div className="bg-sky-50/40 border border-sky-200/80 rounded-2xl p-3 space-y-3">
              {/* 4-Month Advance Quick Month Switcher */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-xl border border-sky-100 text-[11px] font-bold shadow-sm">
                {FOUR_ADVANCE_MONTHS.map((m, idx) => (
                  <button
                    key={m.nameEn}
                    type="button"
                    onClick={() => setSelectedMonthIndex(idx)}
                    className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer truncate text-center ${
                      selectedMonthIndex === idx
                        ? 'bg-[#0091ea] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'ml' ? m.nameMl.split(' ')[0] : m.nameEn.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Month & Year Title Bar */}
              <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <span>{language === 'ml' ? currentMonth.nameMl : currentMonth.nameEn}</span>
                </span>
                <span className="text-[10px] text-sky-600 font-semibold bg-white border border-sky-100 px-2 py-0.5 rounded-md">
                  {selectedDates.length} {language === 'ml' ? 'തീയതികൾ തിരഞ്ഞെടുത്തു' : 'days picked'}
                </span>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {daysOfWeek.map((day, i) => (
                  <div key={i} className="text-[10px] font-bold text-slate-400 py-0.5">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarSlots.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="h-8 sm:h-9" />;
                  }

                  const key = dateKey(day, currentMonth);
                  const isSelected = selectedDates.includes(key);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDate(day)}
                      className={`h-8 sm:h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                        isSelected
                          ? 'bg-[#0091ea] text-white shadow-sm font-black'
                          : 'bg-white hover:bg-sky-100/70 text-slate-700 border border-slate-100 hover:border-sky-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Selected Dates Display Strip */}
              <div className="pt-2 border-t border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
                <div className="flex items-center gap-1.5 truncate max-w-full">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    {formattedDateDisplay}
                  </span>
                </div>
                <span className="text-[10px] text-sky-700 font-semibold bg-sky-100/70 px-2 py-0.5 rounded-md self-start sm:self-auto">
                  {language === 'ml' ? 'ഹൈറാകു ലഭ്യത പരിശോധിക്കും' : 'Subject to Hyraku Availability'}
                </span>
              </div>
            </div>
          </div>

          {/* Green WhatsApp Submit Button matching user design */}
          <div className="pt-2 space-y-2">
            {formError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</p>}
            <button
              type="submit"
              className="w-full bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
              </svg>
              <span>{language === 'ml' ? 'WhatsApp വഴി ബുക്കിംഗ് അഭ്യർത്ഥന അയക്കുക' : 'Send Booking Request to WhatsApp'}</span>
            </button>
            
            <p className="text-center text-[11px] text-slate-500 font-medium">
              {language === 'ml'
                ? 'ഹൈറാകു ടീം ലഭ്യത പരിശോധിച്ച ശേഷം WhatsApp സന്ദേശം വഴി മാത്രമേ ബുക്കിംഗ് സ്ഥിരീകരിക്കപ്പെടൂ.'
                : 'Booking is confirmed ONLY after Hyraku checks availability and delivers confirmation via WhatsApp.'}
            </p>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
};
