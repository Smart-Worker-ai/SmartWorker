import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Wrench, ShieldCheck, TrendingUp, MapPin, Star, Users, ArrowRight, Zap, Lightbulb, Droplets, Hammer, Wind, Paintbrush, Layers, Flame, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, t } = useTheme();

  const STATS = [
    { label: t('Registered Workers'), value: '500+', icon: Users },
    { label: t('Services Completed'), value: '2,000+', icon: Zap },
    { label: t('Districts Covered'),  value: '1',     icon: MapPin },
    { label: t('Avg. Rating'),        value: '4.7★',  icon: Star },
  ];

  const SERVICES = [
    { name: t('Electrician'),   Icon: Lightbulb, color: 'from-yellow-400 to-orange-500' },
    { name: t('Plumber'),       Icon: Droplets, color: 'from-blue-400 to-cyan-500' },
    { name: t('Carpenter'),     Icon: Hammer, color: 'from-amber-400 to-yellow-500' },
    { name: t('AC Technician'), Icon: Wind, color: 'from-sky-400 to-blue-500' },
    { name: t('Painter'),       Icon: Paintbrush, color: 'from-pink-400 to-rose-500' },
    { name: t('Mason'),         Icon: Layers, color: 'from-orange-400 to-red-500' },
    { name: t('Welder'),        Icon: Flame, color: 'from-red-400 to-orange-500' },
    { name: t('More...'),       Icon: Plus, color: 'from-purple-400 to-indigo-500' },
  ];

  const HOW = [
    { step: '01', title: t('Register'),     desc: t('Fill your details, upload your documents and submit.') },
    { step: '02', title: t('Get Verified'), desc: t('Our team reviews your profile within 24 hours.') },
    { step: '03', title: t('Get Hired'),    desc: t('Customers in your area can find and book you instantly.') },
  ];

  const BENEFITS = [
    { icon: TrendingUp, title: t('Earn More'),         desc: t('Set your own daily rate. No middlemen. Keep 100% of what you earn.'), color: 'text-green-500' },
    { icon: ShieldCheck, title: t('Verified Profile'), desc: t('Once verified, customers trust you. A badge that builds your reputation.'), color: 'text-blue-500' },
    { icon: MapPin,      title: t('Work Nearby'),       desc: t('Choose towns across Kozhikode district where you want to work. No long commutes.'), color: 'text-purple-500' },
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      {/* ── Navbar ── */}
      <nav className={`fixed top-0 w-full backdrop-blur-md border-b z-50 transition-colors duration-300
        ${isDark ? 'bg-gray-950/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-brand-900'}`}>{t('SmartWorker')}</span>
          </div>
          <button
            onClick={() => navigate('/register')}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
          >
            {t('Join Now')}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-24 pb-16 sm:pb-20 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: (i % 4) * 20 + 20,
                height: (i % 4) * 20 + 20,
                left: `${(i * 8.3) % 100}%`,
                top: `${(i * 13) % 100}%`,
              }}
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: (i % 3) + 4, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-block bg-white/20 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full mb-5 sm:mb-6 backdrop-blur">
              {t("Kerala's #1 Skilled Worker Platform")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-tight mb-5 sm:mb-6">
              {t('Your Skills,')}<br />
              <span className="text-yellow-300">{t('Your Income')}</span>
            </h1>
            <p className="text-base sm:text-xl text-white/80 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
              {t('Join thousands of skilled tradespeople across Kerala earning more by connecting directly with customers who need your expertise.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/register')}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 transition-colors">
                {t('Register as Worker')} <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/terms')}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg border border-white/30 transition-colors">
                {t('Read T&C')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={`py-12 sm:py-16 transition-colors duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-6 text-center shadow-sm border transition-colors duration-300
                ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <s.icon className="w-8 h-8 text-brand-500 mx-auto mb-3" />
              <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-brand-900'}`}>{s.value}</div>
              <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section className={`py-14 sm:py-20 transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className={`text-3xl sm:text-4xl font-black mb-3 sm:mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('We cover all trades')}
            </h2>
            <p className={`text-base sm:text-lg px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('From electrical to painting — if you have a skill, we have customers.')}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.05, y: -4 }}
                className={`bg-gradient-to-br ${s.color} p-6 rounded-2xl text-center text-white cursor-pointer shadow-md`}
              >
                <s.Icon className="w-10 h-10 mx-auto mb-3 text-white" strokeWidth={1.5} />
                <div className="font-bold text-sm">{s.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-14 sm:py-20 bg-brand-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3 sm:mb-4">{t('How it works')}</h2>
            <p className="text-white/60 text-base sm:text-lg">{t('Get hired in 3 simple steps')}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-8">
            {HOW.map((h, i) => (
              <motion.div
                key={h.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative"
              >
                <div className="text-8xl font-black text-white/10 absolute -top-4 -left-2">{h.step}</div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-3">{h.title}</h3>
                  <p className="text-white/60 leading-relaxed">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className={`py-14 sm:py-20 transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('Why SmartWorker?')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-8">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`rounded-2xl p-8 border transition-colors duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
              >
                <b.icon className={`w-10 h-10 ${b.color} mb-5`} />
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{b.title}</h3>
                <p className={isDark ? 'text-gray-400 leading-relaxed' : 'text-gray-500 leading-relaxed'}>{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 sm:py-20 bg-gradient-to-r from-brand-600 to-indigo-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">{t('Ready to start earning?')}</h2>
            <p className="text-white/80 text-base sm:text-lg mb-8">{t('Join SmartWorker today. Registration takes less than 5 minutes.')}</p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register')}
              className="bg-white text-brand-700 font-bold px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg hover:bg-gray-50 transition-colors shadow-xl"
            >
              {t("Register Now — It's Free")}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-brand-900 text-white/60 py-8 text-center text-sm">
        <p>{t('© 2026 Crewzo. All rights reserved. | Kerala, India')}</p>
        <p className="mt-2">
          <button onClick={() => navigate('/terms')} className="hover:text-white underline transition-colors">
            {t('Terms & Conditions')}
          </button>
          {' · '}
          <a href="mailto:support@crewzo.in" className="hover:text-white transition-colors">
            support@crewzo.in
          </a>
        </p>
      </footer>
    </div>
  );
}
