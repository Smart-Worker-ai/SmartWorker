import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HardHat, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import CrewScene from './CrewScene.jsx';

interface HeroProps {
  onBookClick?: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const Hero: React.FC<HeroProps> = () => {
  const { t, language } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-sky-50/40 pt-6 sm:pt-12 lg:pt-16 pb-8 sm:pb-16 lg:pb-20 border-b border-sky-100">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="hidden lg:block absolute inset-y-0 right-0 w-1/2 opacity-10 bg-[radial-gradient(#0091ea_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <motion.div
            className="lg:col-span-7 space-y-4 sm:space-y-6 max-w-xl"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-sky-100/90 border border-sky-200 text-[#0070ba] text-[11px] sm:text-xs md:text-sm font-bold tracking-wide shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#0091ea] shadow-[0_0_8px_#0091ea] animate-pulse" />
              <span>{t('hero_badge')}</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.14] font-display"
            >
              <span className="block">{t('hero_title_line1')}</span>
              <span className="block text-[#0091ea]">{t('hero_title_line2')}</span>
              <span className="block text-slate-800">{t('hero_title_line3')}</span>
            </motion.h1>

            <motion.div
              variants={fadeUp}
              className="sm:hidden relative rounded-2xl overflow-hidden border-2 border-sky-200 shadow-md shadow-sky-100 bg-white my-3"
            >
              <CrewScene compact />
              <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/85 backdrop-blur-sm rounded-xl px-3 py-2 text-white flex items-center justify-between border border-white/20 shadow-md">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0091ea] shrink-0" />
                  <span className="text-xs font-bold font-display">
                    {language === 'ml' ? 'ഹൈറാകു ഫീൽഡ് ടീം' : 'Official Hyraku Field Crew'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                  {language === 'ml' ? 'യൂണിഫോം' : 'Uniformed'}
                </span>
              </div>
            </motion.div>

            <motion.p variants={fadeUp} className="text-sm sm:text-base md:text-lg text-slate-700 leading-relaxed font-normal">
              {t('hero_desc')}
            </motion.p>

            <motion.div variants={fadeUp} className="pt-0.5 flex items-center gap-2 text-slate-800 text-xs sm:text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0091ea] shrink-0" />
              <span>{t('hero_perks')}</span>
            </motion.div>

            <motion.div variants={fadeUp} className="pt-3 sm:pt-6 border-t border-sky-200/80 grid grid-cols-3 gap-2.5 sm:gap-6">
              {[
                { num: t('hero_stat1_num'), label: t('hero_stat1_label'), color: 'text-[#092244]' },
                { num: t('hero_stat2_num'), label: t('hero_stat2_label'), color: 'text-[#0091ea]' },
                { num: t('hero_stat3_num'), label: t('hero_stat3_label'), color: 'text-[#092244]' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/90 sm:bg-sky-50/50 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-sky-100 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                  <div className={`text-lg sm:text-2xl md:text-3xl font-black font-display ${stat.color}`}>{stat.num}</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="hidden lg:block lg:col-span-5 relative"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.15 }}
          >
            <div className="relative rounded-3xl overflow-hidden border-2 border-sky-200/90 shadow-xl shadow-sky-100 bg-white">
              <CrewScene />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-sky-100 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-[#0091ea]">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 font-display">
                      {language === 'ml' ? 'ഹൈറാകു ഫീൽഡ് ക്രൂ' : 'Official Hyraku Crew'}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      {language === 'ml' ? 'യൂണിഫോമും സുരക്ഷയും ഉറപ്പുവരുത്തിയവർ' : 'Uniformed & Verified on Site'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#0091ea] bg-sky-50 px-3 py-1.5 rounded-full border border-sky-200 shadow-sm">
                  {language === 'ml' ? 'ലഭ്യമാണ്' : 'Ready on Site'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
