import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Each section: [titleKey, bodyKey] — translated at render time.
// Both English source and Malayalam translation live in the ThemeContext dictionary.
const SECTIONS = [
  ['1. Acceptance',
    'By registering on Crewzo, you agree to these Terms & Conditions. If you do not agree, do not register.'],
  ['2. Eligibility',
    'You must be at least 18 years of age and a resident of India. You must possess the skills you claim to offer.'],
  ['3. Document Verification',
    'You must upload genuine documents (Aadhaar card, passbook). Submitting false documents will result in immediate termination and may lead to legal action.'],
  ['4. Code of Conduct',
    'Workers must maintain professional conduct at all times. Harassment, fraud, or unprofessional behavior will result in permanent account suspension.'],
  ['5. Payments & Rates',
    'Crewzo facilitates connections. Customers pay based on your listed daily rate. Crewzo does not deduct any commission — you keep 100% of the agreed amount.'],
  ['6. Availability',
    'You are responsible for keeping your availability accurate. Repeated no-shows to confirmed bookings will result in account suspension.'],
  ['7. Facilities & Requests',
    'Facility requests (food, accommodation, etc.) are requests only. Customers are not obligated to provide them. Disputes regarding facilities must be reported through the app.'],
  ['8. Privacy',
    'Your Aadhaar and passbook documents are stored securely and used only for identity verification. They are not shared with third parties or customers.'],
  ['9. Account Suspension',
    'Crewzo reserves the right to suspend or permanently block accounts for violations of these terms, fraudulent activity, or upon receiving substantiated complaints.'],
  ['10. Governing Law',
    'These Terms are governed by Indian law. Disputes shall be resolved in courts in Kerala, India.'],
];

export default function TermsPage() {
  const navigate = useNavigate();
  const { isDark, t } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <nav className={`border-b px-6 h-14 flex items-center gap-3 sticky top-0 z-10 backdrop-blur transition-colors
        ${isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
        <button onClick={() => navigate(-1)} className={`transition-colors
          ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('Terms & Conditions')}</span>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('Crewzo Worker Terms')}
          </h1>
          <p className={`text-sm mb-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('Last updated: April 2026')}</p>

          <div className="space-y-6">
            {SECTIONS.map(([title, body], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl p-6 border shadow-sm transition-colors
                  ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
              >
                <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t(title)}</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t(body)}</p>
              </motion.div>
            ))}
          </div>

          <div className="h-8" />
        </div>
      </div>

      <div className={`border-t px-6 py-4 sticky bottom-0 shadow-lg backdrop-blur transition-colors
        ${isDark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
        <button
          onClick={() => navigate('/register')}
          className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" /> {t('Continue to Registration')}
        </button>
        <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {t('You will confirm acceptance on the final step of the registration form.')}
        </p>
      </div>
    </div>
  );
}
