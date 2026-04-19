import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Phone } from 'lucide-react';

export default function SuccessPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        </motion.div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">You're Registered!</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Your application has been submitted. Our team will review your documents and
          verify your profile within <strong>24 hours</strong>.
        </p>
        <div className="space-y-4 mb-8">
          {[
            { icon: Clock, text: 'Verification takes 24–48 hours', color: 'text-blue-500' },
            { icon: Phone, text: 'We'll contact you on your registered mobile', color: 'text-purple-500' },
            { icon: CheckCircle, text: 'Once verified, customers can find and book you', color: 'text-green-500' },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <span className="text-sm text-gray-700">{text}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-colors"
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  );
}
