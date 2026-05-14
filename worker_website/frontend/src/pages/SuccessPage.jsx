import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Mail } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function SuccessPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  return (
    <div className={`min-h-screen flex items-center justify-center px-6
      ${isDark ? 'bg-gray-950' : 'bg-gradient-to-br from-green-50 to-emerald-100'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className={`rounded-3xl shadow-xl p-10 max-w-md w-full text-center
          ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        </motion.div>
        <h1 className={`text-3xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          You're Registered!
        </h1>
        <p className={`mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Your application has been submitted. Our team will review your documents and
          verify your profile within <strong>24 hours</strong>.
        </p>
        <div className="space-y-4 mb-8">
          {[
            { icon: Clock, text: 'Verification takes 24–48 hours', color: 'text-blue-500' },
            { icon: Mail, text: "You'll receive an email when your profile is approved", color: 'text-purple-500' },
            { icon: CheckCircle, text: 'Once verified, customers can find and book you', color: 'text-green-500' },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className={`flex items-center gap-3 text-left rounded-xl p-4
              ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{text}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors"
        >
          ← Back
        </button>
      </motion.div>
    </div>
  );
}
