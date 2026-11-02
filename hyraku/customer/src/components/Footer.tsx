import React from 'react';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { HyrakuLogo } from './HyrakuLogo';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onNavigateHome: () => void;
  onStartBooking: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onStartBooking,
  onOpenAbout,
  onOpenContact,
}) => {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-white border-t border-sky-100 pt-16 pb-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-sky-50">
          {/* Brand & Tagline */}
          <div className="space-y-2">
            <HyrakuLogo
              variant="blue"
              imgClassName="h-8 w-auto hover:opacity-90 transition-opacity"
              onClick={onNavigateHome}
            />
            <p className="text-sm font-semibold text-slate-500">
              {language === 'ml'
                ? 'നിങ്ങളുടെ വിശ്വസ്ത ലേബർ പാർട്ണർ'
                : 'Your Reliable Labour Partner'}
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-sm font-medium">
            <button
              onClick={onNavigateHome}
              className="text-slate-600 hover:text-[#0091ea] transition-colors cursor-pointer"
            >
              {t('nav_home')}
            </button>
            <button
              onClick={onOpenAbout}
              className="text-slate-600 hover:text-[#0091ea] transition-colors cursor-pointer"
            >
              {t('nav_about')}
            </button>
            <button
              onClick={onStartBooking}
              className="text-slate-600 hover:text-[#0091ea] transition-colors cursor-pointer"
            >
              {t('nav_workers')}
            </button>
            <button
              onClick={onOpenContact}
              className="text-slate-600 hover:text-[#0091ea] transition-colors cursor-pointer"
            >
              {t('nav_contact')}
            </button>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-[#0091ea] flex items-center justify-center transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-[#0091ea] flex items-center justify-center transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-[#0091ea] flex items-center justify-center transition-colors"
            >
              <Youtube className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2025 Hyraku. {language === 'ml' ? 'സർവ്വ അവകാശങ്ങളും നിക്ഷിപ്തം.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <span>{language === 'ml' ? 'സ്ഥിരീകരിച്ച തൊഴിലാളികളുടെ പ്ലാറ്റ്ഫോം' : 'Verified Masons & Labour Platform'}</span>
            <span>•</span>
            <a href="tel:+916238476615" className="hover:text-[#0091ea] transition-colors">
              +91 62384 76615
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
