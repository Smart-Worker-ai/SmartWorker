import React from 'react';
import { Clock, AlertCircle, CheckCircle2, MessageSquare, X, Send } from 'lucide-react';
import { CustomerBookingData } from './BookingDetailsForm';
import { HyrakuLogo } from '../HyrakuLogo';
import { useLanguage } from '../../context/LanguageContext';

interface BookingSuccessModalProps {
  bookingId: string;
  bookingData: CustomerBookingData | null;
  whatsappUrl?: string;
  onClose: () => void;
  onNavigateHome: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  bookingId,
  bookingData,
  whatsappUrl,
  onClose,
  onNavigateHome,
}) => {
  const { t, language } = useLanguage();

  if (!bookingData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm ">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-sky-100 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Status Icon */}
        <div className="text-center space-y-2 mb-4">
          <div className="flex justify-center mb-1">
            <HyrakuLogo variant="blue" imgClassName="h-6 w-auto" />
          </div>
          
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 stroke-[2.2] animate-pulse" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              {language === 'ml'
                ? 'അഭ്യർത്ഥന ലഭിച്ചു • ലഭ്യത പരിശോധന'
                : 'REQUEST SENT • CHECKING AVAILABILITY'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
            {t('success_title')}
          </h3>

          <div className="inline-block bg-slate-100 px-3 py-0.5 rounded-lg text-xs font-mono text-slate-700">
            {t('success_ref_id')}: <strong>{bookingId}</strong>
          </div>
        </div>

        {/* Clear Critical Notice: Booking NOT confirmed yet */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 mb-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {language === 'ml'
                ? 'പ്രധാനപ്പെട്ടത്: ബുക്കിംഗ് ഇതുവരെ സ്ഥിരീകരിച്ചിട്ടില്ല'
                : 'Important: Booking is NOT Confirmed Yet'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed font-normal">
            {language === 'ml'
              ? 'നിങ്ങൾ തിരഞ്ഞെടുത്ത തീയതികളിൽ വിദഗ്ദ്ധ തൊഴിലാളികളുടെ ലഭ്യത ഹൈറാകു സംഘം ഇപ്പോൾ പരിശോധിക്കുകയാണ്. ലഭ്യത ഉറപ്പുവരുത്തിയ ശേഷം WhatsApp വഴി നിങ്ങൾക്ക് ഔദ്യോഗിക സ്ഥിരീകരണ സന്ദേശം ലഭിക്കുമ്പോൾ മാത്രമേ ബുക്കിംഗ് ഉറപ്പാകൂ.'
              : 'Hyraku dispatch is currently checking skilled worker availability for your requested dates. Your booking is ONLY confirmed once you receive our confirmation message delivered directly to you on WhatsApp.'}
          </p>

          {/* Visual 3-Step Confirmation Lifecycle */}
          <div className="pt-2 border-t border-amber-200/70 grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="bg-white rounded-lg p-1.5 border border-emerald-200 shadow-sm">
              <div className="text-emerald-600 font-black">1. {language === 'ml' ? 'അഭ്യർത്ഥന' : 'Sent'}</div>
              <div className="text-[9px] text-slate-500">{language === 'ml' ? 'WhatsApp വഴി' : 'To WhatsApp'}</div>
            </div>
            <div className="bg-amber-100/80 rounded-lg p-1.5 border border-amber-300 shadow-sm">
              <div className="text-amber-900 font-black">2. {language === 'ml' ? 'ലഭ്യത' : 'Checking'}</div>
              <div className="text-[9px] text-amber-800 font-semibold">{language === 'ml' ? 'ഹൈറാകു പരിശോധന' : 'Hyraku Review'}</div>
            </div>
            <div className="bg-sky-50 rounded-lg p-1.5 border border-sky-200 shadow-sm">
              <div className="text-[#0091ea] font-black">3. {language === 'ml' ? 'സ്ഥിരീകരണം' : 'Confirm'}</div>
              <div className="text-[9px] text-slate-600">{language === 'ml' ? 'WhatsApp സന്ദേശം' : 'WhatsApp Msg'}</div>
            </div>
          </div>
        </div>

        {/* Request Details Summary Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 space-y-2.5 text-xs mb-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">{t('client_name_label')}</span>
            <span className="font-bold text-slate-900">{bookingData.customerName}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">{t('phone_label')}</span>
            <span className="font-bold text-slate-900">+91 {bookingData.mobileNumber.replace(/^\+?91\s*/, '').trim()}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">
              {language === 'ml' ? 'സ്ഥലം & ടൗൺ' : 'Location'}
            </span>
            <span className="font-bold text-slate-900 text-right">
              {bookingData.locality} , {bookingData.town}
            </span>
          </div>

          <div className="flex items-start justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">{t('summary_dates')}</span>
            <div className="text-right">
              {bookingData.selectedDatesList && bookingData.selectedDatesList.length > 1 ? (
                <div className="space-y-0.5">
                  {bookingData.selectedDatesList.map((d, idx) => (
                    <div key={idx} className="font-bold text-slate-900 text-xs">
                      • {d}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="font-bold text-slate-900">
                  {bookingData.bookingDate}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-500 font-medium">{t('summary_crew')}</span>
            <span className="font-bold text-[#0091ea] text-right truncate max-w-[200px]">
              {bookingData.crewSummaryText}
            </span>
          </div>
        </div>

        {/* Action Buttons: Open WhatsApp & Return to Home */}
        <div className="space-y-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
              </svg>
              <span>{language === 'ml' ? 'ഹൈറാകു WhatsApp തുറക്കുക (+91 62384 76615)' : 'Open Hyraku WhatsApp (+91 62384 76615)'}</span>
            </a>
          )}

          <button
            onClick={() => {
              onClose();
              onNavigateHome();
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>{t('success_close_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
