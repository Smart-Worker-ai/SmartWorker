import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const ML = {
  dashboard: 'ഡാഷ്‌ബോർഡ്',
  customers: 'ഉപഭോക്താക്കൾ',
  workers: 'തൊഴിലാളികൾ',
  bookings: 'ബുക്കിംഗ്',
  grievances: 'പരാതികൾ',
  logout: 'ലോഗൗട്ട്',
  approve: 'അംഗീകരിക്കുക',
  reject: 'നിരസിക്കുക',
  block: 'ബ്ലോക്ക്',
  unblock: 'അൺബ്ലോക്ക്',
  delete: 'ഇല്ലാതാക്കുക',
  search: 'തിരയുക',
  settings: 'ക്രമീകരണം',
  darkMode: 'ഡാർക്ക് മോഡ്',
  language: 'ഭാഷ',
  adminPortal: 'അഡ്മിൻ പോർട്ടൽ',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('sw_theme');
    return stored ? stored === 'dark' : false; // Default to light mode
  });
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('sw_lang') || 'en';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sw_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('sw_lang', lang);
  }, [lang]);

  const t = (key) => (lang === 'ml' ? ML[key] : null) ?? key;

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, lang, setLang, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
