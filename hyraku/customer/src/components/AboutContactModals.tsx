import React, { useState } from 'react';
import { X, Phone, MapPin, HardHat, Send } from 'lucide-react';
import { HyrakuLogo } from './HyrakuLogo';
import {
  HYRAKU_WHATSAPP_DISPLAY,
  openHyrakuWhatsApp,
  persistHyrakuEnquiry,
} from '../context/BookingContext.jsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm ">
      <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <HyrakuLogo variant="blue" imgClassName="h-8 w-auto" />
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2 font-display">
            About Hyraku
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your Reliable Labour Partner
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            <strong>Hyraku</strong> was founded to solve one of the construction and renovation sector's biggest bottlenecks: sourcing verified, skilled, and punctual labour when you actually need them.
          </p>

          <p>
            Traditionally, homeowners and contractors lose days negotiating through unverified middlemen or waiting at roadside labour junctions with no guarantee of skill level, safety training, or background check.
          </p>

          <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <HardHat className="w-4 h-4 text-[#0091ea]" />
              Our Mission
            </h4>
            <p className="text-slate-600 text-xs">
              "To empower skilled tradesmen with transparent, dignified daily employment while giving builders and homeowners frictionless access to verified masons, concrete setters, bricklayers, stone setters, tilers, and painters."
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-xl font-bold text-slate-900 block font-display">1,400+</span>
              <span className="text-[11px] text-slate-500">Active Craftsmen</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-xl font-bold text-slate-900 block font-display">100%</span>
              <span className="text-[11px] text-slate-500">Aadhaar Verified</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#0091ea] text-white px-6 py-2.5 rounded-xl font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const ContactModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [contactName, setContactName] = useState('');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  async function submitEnquiry(e: React.FormEvent) {
    e.preventDefault();
    const raw = contactName.trim();
    const digits = raw.replace(/\D/g, '');
    const phone = digits.length >= 10 ? digits.slice(-10) : digits;
    const name = raw.replace(/[+0-9\s-]{8,}/, '').trim() || raw;
    const message = `*HYRAKU ENQUIRY*
--------------------------
*Name / Phone:* ${raw}
*Message:* ${details.trim()}
--------------------------
_Sent via Hyraku website_`;
    await persistHyrakuEnquiry({
      source: 'contact',
      customer_name: name,
      phone: phone || '0000000000',
      message,
    });
    openHyrakuWhatsApp(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm ">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <HyrakuLogo variant="blue" imgClassName="h-7 w-auto" />
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2 font-display">
            Contact Support & Dispatch
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enquiries go directly to Hyraku WhatsApp
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 text-xs text-slate-600">
            <a
              href="tel:+916238476615"
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#0091ea] hover:bg-sky-50/70 transition-colors"
            >
              <Phone className="w-5 h-5 text-[#0091ea] shrink-0" />
              <div>
                <div className="font-bold text-slate-800">Call helpline</div>
                <div>{HYRAKU_WHATSAPP_DISPLAY}</div>
              </div>
            </a>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <MapPin className="w-5 h-5 text-[#0091ea] shrink-0" />
              <div>
                <div className="font-bold text-slate-800">Central Dispatch Hub</div>
                <div>2nd Floor, Trade Center, Mavoor Road, Kozhikode, Kerala 673004</div>
              </div>
            </div>
          </div>

          <form onSubmit={submitEnquiry} className="space-y-3 pt-2">
            <div>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your Name & Phone Number"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0091ea]"
              />
            </div>
            <div>
              <textarea
                required
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Briefly state your project requirements or question..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0091ea]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#25D366] hover:bg-[#1dae54] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send enquiry on WhatsApp</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
