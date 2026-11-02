import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';
import { HyrakuLogo } from './HyrakuLogo';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { language, setIsLanguageModalOpen } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const isStep1 = location.pathname === '/book';
  const isStep2 = location.pathname === '/book/details';
  const isBookingFlow = isStep1 || isStep2;

  return (
    <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/95 text-slate-800 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            {isBookingFlow && (
              <button
                type="button"
                onClick={() => navigate(isStep2 ? '/book' : '/')}
                className="-ml-1 cursor-pointer rounded-xl p-1.5 text-slate-700 hover:bg-sky-50 hover:text-slate-900"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Link to="/" aria-label="Hyraku Home">
              <HyrakuLogo variant="blue" imgClassName="h-6 sm:h-7 md:h-8 w-auto" showTagline={false} />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isStep1 && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-[#0091ea]">
                {language === 'ml' ? 'ഘട്ടം 1 / 2' : 'Step 1 of 2'}
              </span>
            )}
            {isStep2 && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-[#0091ea]">
                {language === 'ml' ? 'ഘട്ടം 2 / 2' : 'Step 2 of 2'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsLanguageModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-sky-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-sky-50"
            >
              <Globe className="h-3.5 w-3.5 text-[#0091ea]" />
              {language === 'ml' ? 'ML' : 'EN'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
