import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, Translations } from '../translations/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
  isLanguageModalOpen: boolean;
  setIsLanguageModalOpen: (open: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'hyraku_preferred_lang';
const HAS_SELECTED_KEY = 'hyraku_lang_chosen';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read saved preference if available, default to English
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (savedLang === 'en' || savedLang === 'ml') {
        return savedLang;
      }
    }
    return 'en';
  });

  // Open modal on first page entry if user hasn't explicitly chosen or dismissed in this session
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const sessionDismissed = sessionStorage.getItem('hyraku_lang_modal_dismissed');
      const hasChosen = localStorage.getItem(HAS_SELECTED_KEY);
      // Show if either never chosen or not dismissed this session
      return !sessionDismissed && !hasChosen;
    }
    return true;
  });

  useEffect(() => {
    // If not chosen yet, ensure modal is open
    const sessionDismissed = sessionStorage.getItem('hyraku_lang_modal_dismissed');
    const hasChosen = localStorage.getItem(HAS_SELECTED_KEY);
    if (!sessionDismissed && !hasChosen) {
      setIsLanguageModalOpen(true);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem(HAS_SELECTED_KEY, 'true');
      sessionStorage.setItem('hyraku_lang_modal_dismissed', 'true');
    }
    setIsLanguageModalOpen(false);
  };

  const t = (key: keyof Translations): string => {
    const currentDict = translations[language];
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English
    return translations.en[key] || (key as string);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLanguageModalOpen,
        setIsLanguageModalOpen,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
