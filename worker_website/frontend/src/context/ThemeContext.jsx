import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const ML = {
  'Worker Registration': 'തൊഴിലാളി രജിസ്ട്രേഷൻ',
  'Personal Info': 'വ്യക്തിഗത വിവരങ്ങൾ',
  'Job Details': 'ജോലി വിവരങ്ങൾ',
  Documents: 'രേഖകൾ',
  Review: 'അവലോകനം',
  'Full Name': 'പൂർണ്ണ നാമം',
  Age: 'പ്രായം',
  Gender: 'ലിംഗം',
  'Mobile Number': 'മൊബൈൽ നമ്പർ',
  'Email Address': 'ഇമെയിൽ വിലാസം',
  Address: 'വിലാസം',
  'Job Type': 'ജോലി തരം',
  'Submit Application': 'അപേക്ഷ സമർപ്പിക്കുക',
  Continue: 'തുടരുക',
  Back: 'പിന്നോട്ട്',
  'Dark Mode': 'ഡാർക്ക് മോഡ്',
  Language: 'ഭാഷ',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('wp_theme') === 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('wp_lang') || 'en');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('wp_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('wp_lang', lang);
  }, [lang]);

  const t = (key) => (lang === 'ml' ? ML[key] : null) ?? key;

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, lang, setLang, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
