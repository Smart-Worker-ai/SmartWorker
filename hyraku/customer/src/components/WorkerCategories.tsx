import React from 'react';
import { motion } from 'framer-motion';
import { WORKER_CATEGORIES } from '../data/workersData';
import { WorkerCategory } from '../types';
import { ArrowRight, HardHat, ShieldCheck, Clock, Users, PhoneCall } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface WorkerCategoriesProps {
  onSelectCategory: (categoryId: WorkerCategory) => void;
  onBookWorkers: () => void;
}

export const WorkerCategories: React.FC<WorkerCategoriesProps> = ({ 
  onSelectCategory,
  onBookWorkers,
}) => {
  const { t, language } = useLanguage();

  const getCategoryName = (id: string, defaultShortName: string) => {
    if (language === 'ml') {
      switch (id) {
        case 'general-workers':
          return 'സാധാരണ തൊഴിലാളികൾ';
        case 'concrete-finisher':
          return 'കോൺക്രീറ്റ് ഫിനിഷർ / സിമന്റ് സെറ്റർ';
        case 'bricklayer':
          return 'കട്ടകെട്ട് മേസ്തിരി';
        case 'stone-setter':
          return 'സ്റ്റോൺ ബ്രേക്കർ / സ്റ്റോൺ സെറ്റർ';
        case 'tiler':
          return 'ടൈൽ & മാർബിൾ';
        case 'painter':
          return 'പെയിന്റിംഗ്';
        default:
          return defaultShortName;
      }
    }
    switch (id) {
      case 'concrete-finisher':
        return 'Concrete Finisher / Cement Setter';
      case 'stone-setter':
        return 'Stone Breaker / Stone Setter';
      default:
        return defaultShortName;
    }
  };

  const getTierName = (id: string, tier: string) => {
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

  return (
    <section id="workers-section" className="py-8 sm:py-14 md:py-16 bg-gradient-to-b from-white via-sky-50/20 to-white border-b border-sky-100">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
        {/* hyraku branding title above worker types matching screenshot 1793420728063_9dd82ffd.png */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#7cb7e3] font-sans tracking-tight lowercase">
            hyraku
          </h2>
        </div>

        {/* Clean Grid of Worker Types matching user screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {WORKER_CATEGORIES.map((cat, index) => {
            const isLabour = cat.id === 'general-workers' || cat.id === 'painter';
            return (
              <motion.div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-sky-100/90 hover:border-[#0091ea] transition-shadow duration-200 flex flex-col cursor-pointer active:scale-[0.98]"
              >
                {/* Photo Thumbnail with Badge from screenshot */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                  <img
                    src={cat.image}
                    alt={cat.shortName}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Badge overlay matching screenshot */}
                  <span
                    className={`absolute bottom-2 left-2 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold text-white shadow-sm tracking-wide ${
                      isLabour ? 'bg-[#f97316]' : 'bg-slate-900/70 backdrop-blur-sm'
                    }`}
                  >
                    {getTierName(cat.id, cat.tier)}
                  </span>
                </div>

                {/* Card Title & Select -> exactly like screenshot */}
                <div className="p-2.5 sm:p-3.5 text-center flex-1 flex flex-col justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-[#0091ea] transition-colors font-display line-clamp-2 min-h-[2.4rem] flex items-center justify-center leading-snug">
                    {getCategoryName(cat.id, cat.shortName)}
                  </h3>
                  
                  <span className="text-xs sm:text-sm text-[#0091ea] font-bold mt-1 flex items-center justify-center gap-1 group-hover:underline">
                    <span>{language === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Select'}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Book Worker Section Directly Under Type of Workers (Mobile Ergonomic) */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/70 rounded-2xl sm:rounded-3xl border border-sky-200/90 p-4 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 text-center md:text-left">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-[#0091ea] text-[11px] font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {language === 'ml' ? 'ഉടനടി സൈറ്റ് ബുക്കിംഗ്' : 'Instant Site Dispatch'}
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 font-display">
                {language === 'ml'
                  ? 'നിങ്ങളുടെ സൈറ്റിലേക്ക് തൊഴിലാളികളെ വേണമെന്നുണ്ടോ?'
                  : 'Need Verified Workers for Your Site?'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                {language === 'ml'
                  ? 'തൊഴിലാളികളുടെ എണ്ണവും തീയതികളും നൽകി ബുക്കിംഗ് അഭ്യർത്ഥന അയക്കുക. ഹൈറാകു WhatsApp വഴി ലഭ്യത പരിശോധിച്ച് സ്ഥിരീകരിക്കും.'
                  : 'Choose crew size and dates to submit a booking request. Hyraku verifies worker availability and confirms via WhatsApp.'}
              </p>
              
              <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0091ea]" />
                  <span>{language === 'ml' ? 'കമ്മീഷൻ ഇല്ല' : '0% Commission'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0091ea]" />
                  <span>{language === 'ml' ? '4 മാസം മുൻകൂട്ടി' : '4-Month Advance'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <HardHat className="w-3.5 h-3.5 text-[#0091ea]" />
                  <span>{language === 'ml' ? 'പരിശോധിച്ചുറപ്പിച്ചവർ' : 'Vetted Craftsmen'}</span>
                </span>
              </div>
            </div>

            {/* Prominent Book Worker Action Buttons (Mobile Touch Friendly) */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={onBookWorkers}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#0091ea] hover:bg-[#0284c7] active:bg-[#0369a1] active:scale-[0.98] text-white px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-full font-bold text-sm sm:text-base shadow-lg shadow-sky-500/30 transition-all cursor-pointer group min-h-[48px]"
              >
                <span>{t('hero_btn')}</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
              </button>
              
              <a
                href="tel:+916238476615"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-sky-50 active:scale-[0.98] text-sky-900 border border-sky-200 px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-full font-semibold text-xs sm:text-sm transition-all shadow-sm min-h-[44px]"
              >
                <PhoneCall className="w-4 h-4 text-[#0091ea]" />
                <span>+91 62384 76615</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
