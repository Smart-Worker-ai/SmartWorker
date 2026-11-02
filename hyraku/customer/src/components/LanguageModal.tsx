import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Globe, X } from 'lucide-react';

export const LanguageModal: React.FC = () => {
  const { setLanguage, isLanguageModalOpen, setIsLanguageModalOpen } = useLanguage();

  const handleSelectLanguage = (lang: 'en' | 'ml') => {
    setLanguage(lang);
  };

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hyraku_lang_modal_dismissed', 'true');
    }
    setIsLanguageModalOpen(false);
  };

  return (
    <AnimatePresence>
      {isLanguageModalOpen && (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
      onClick={handleClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="relative w-full max-w-[480px] bg-white rounded-2xl sm:rounded-3xl p-7 pt-9 pb-8 sm:p-10 sm:pt-11 sm:pb-10 shadow-2xl select-none border border-slate-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {/* Top-right close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close language selector"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 text-[#0f2744] hover:opacity-70 transition-opacity p-1 cursor-pointer focus:outline-none"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
        </button>

        {/* Modal Title with Globe icon */}
        <div className="text-center mt-1 sm:mt-2 mb-7 sm:mb-9">
          <h2 
            id="language-modal-title"
            className="text-2xl sm:text-[28px] font-bold text-[#0f2744] tracking-tight flex items-center justify-center gap-2 sm:gap-2.5 font-display"
          >
            <span>Choose your language</span>
            <Globe className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.8] text-[#0f2744] shrink-0 inline-block" />
          </h2>
        </div>

        {/* Two Blue Buttons in 2-column grid */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {/* English Button */}
          <button
            type="button"
            onClick={() => handleSelectLanguage('en')}
            className="w-full bg-[#1877f2] hover:bg-[#166fe5] active:bg-[#1366d6] text-white font-medium text-base sm:text-lg py-5 sm:py-6 px-3 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#1877f2]/50"
          >
            <span>English</span>
          </button>

          {/* Malayalam Button */}
          <button
            type="button"
            onClick={() => handleSelectLanguage('ml')}
            className="w-full bg-[#1877f2] hover:bg-[#166fe5] active:bg-[#1366d6] text-white font-medium py-3.5 sm:py-4 px-3 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#1877f2]/50 text-center leading-snug"
          >
            <span className="text-base sm:text-lg font-medium">Malayalam /</span>
            <span className="text-sm sm:text-base font-medium mt-0.5 font-malayalam">മലയാളം</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
