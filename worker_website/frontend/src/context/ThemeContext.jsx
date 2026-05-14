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
  // Landing page
  'Join Now': 'ഇപ്പോൾ ചേരുക',
  'Register as Worker': 'തൊഴിലാളിയായി രജിസ്റ്റർ ചെയ്യുക',
  'Read T&C': 'നിബന്ധനകൾ വായിക്കുക',
  "Register Now — It's Free": 'ഇപ്പോൾ രജിസ്റ്റർ ചെയ്യൂ — സൗജന്യമാണ്',
  'How it works': 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു',
  'Why Smart Workers?': 'എന്തുകൊണ്ട് സ്മാർട്ട് വർക്കേഴ്സ്?',
  'We cover all trades': 'ഞങ്ങൾ എല്ലാ ട്രേഡുകളും കൈകാര്യം ചെയ്യുന്നു',
  // Dashboard page
  Logout: 'ലോഗൗട്ട്',
  'Verification Pending': 'പരിശോധന കാത്തിരിക്കുന്നു',
  Rating: 'റേറ്റിംഗ്',
  Reviews: 'അവലോകനങ്ങൾ',
  District: 'ജില്ല',
  'Profile Details': 'പ്രൊഫൈൽ വിവരങ്ങൾ',
  Mobile: 'മൊബൈൽ',
  'Current Location': 'നിലവിലെ സ്ഥലം',
  'Interested Locations': 'താൽപ്പര്യമുള്ള സ്ഥലങ്ങൾ',
  Experience: 'പരിചയം',
  'Facilities Requested': 'അഭ്യർത്ഥിച്ച സൗകര്യങ്ങൾ',
  'Verification pending message': 'ഞങ്ങളുടെ ടീം നിങ്ങളുടെ രേഖകൾ അവലോകനം ചെയ്യുന്നു. പരിശോധന പൂർത്തിയാകുമ്പോൾ നിങ്ങളെ അറിയിക്കും (24–48 മണിക്കൂർ).',
  'year(s)': 'വർഷം',
  None: 'ഒന്നുമില്ല',
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
