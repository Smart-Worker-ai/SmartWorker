import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Mail, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function SuccessPage() {
  const navigate = useNavigate();
  const { isDark, t } = useTheme();

  const POINTS = [
    { icon: Clock,       text: t('Verification takes 24–48 hours'),                       color: 'text-blue-500' },
    { icon: Mail,        text: t("You'll receive an email when your profile is approved"), color: 'text-purple-500' },
    { icon: CheckCircle, text: t('Once verified, customers can find and book you'),        color: 'text-green-500' },
  ];

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 transition-colors duration-300
      ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-green-50 to-emerald-100'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.7 }}
        className={`rounded-3xl shadow-2xl p-10 max-w-md w-full text-center transition-colors duration-300
          ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="relative inline-block mb-6"
        >
          <div className="absolute inset-0 rounded-full bg-green-500/30 blur-2xl" />
          <CheckCircle className="relative w-20 h-20 text-green-500 mx-auto" />
        </motion.div>
        <h1 className={`text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t("You're Registered!")}
        </h1>
        <p className={`mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('Your application has been submitted. Our team will review your documents and verify your profile within')}{' '}
          <strong className={isDark ? 'text-white' : 'text-gray-900'}>{t('24 hours')}</strong>.
        </p>
        <div className="space-y-3 mb-8">
          {POINTS.map(({ icon: Icon, text, color }) => (
            <div key={text} className={`flex items-center gap-3 text-left rounded-xl p-4 transition-colors
              ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{text}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> {t('Back')}
        </button>
      </motion.div>
    </div>
  );
}
