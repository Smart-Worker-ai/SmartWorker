import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const SECTIONS = [
  ['1. Acceptance', 'By registering on Smart Workers, you agree to these Terms & Conditions. If you do not agree, do not register.'],
  ['2. Eligibility', 'You must be at least 18 years of age and a resident of India. You must possess the skills you claim to offer.'],
  ['3. Document Verification', 'You must upload genuine documents (Aadhaar card, passbook). Submitting false documents will result in immediate termination and may lead to legal action.'],
  ['4. Code of Conduct', 'Workers must maintain professional conduct at all times. Harassment, fraud, or unprofessional behavior will result in permanent account suspension.'],
  ['5. Payments & Rates', 'Smart Workers facilitates connections. Customers pay based on your listed daily rate. Smart Workers does not deduct any commission — you keep 100% of the agreed amount.'],
  ['6. Availability', 'You are responsible for keeping your availability accurate. Repeated no-shows to confirmed bookings will result in account suspension.'],
  ['7. Facilities & Requests', 'Facility requests (food, accommodation, etc.) are requests only. Customers are not obligated to provide them. Disputes regarding facilities must be reported through the app.'],
  ['8. Privacy', 'Your Aadhaar and passbook documents are stored securely and used only for identity verification. They are not shared with third parties or customers.'],
  ['9. Account Suspension', 'Smart Workers reserves the right to suspend or permanently block accounts for violations of these terms, fraudulent activity, or upon receiving substantiated complaints.'],
  ['10. Governing Law', 'These Terms are governed by Indian law. Disputes shall be resolved in courts in Kerala, India.'],
];

export default function TermsPage() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b px-6 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-gray-900">Terms & Conditions</span>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Smart Workers Worker Terms</h1>
          <p className="text-gray-400 text-sm mb-10">Last updated: April 2026</p>

          <div className="space-y-8">
            {SECTIONS.map(([title, body], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>

          <div className="h-8" />
        </div>
      </div>

      <div className="bg-white border-t px-6 py-4 sticky bottom-0 shadow-lg">
        <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 accent-indigo-600 shrink-0"
          />
          <span className="text-sm text-gray-700 font-medium">
            I have read and agree to the Terms & Conditions
          </span>
        </label>
        <button
          disabled={!agreed}
          onClick={() => navigate('/register', { state: { termsAccepted: true } })}
          className="w-full bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" /> Accept & Register
        </button>
      </div>
    </div>
  );
}
