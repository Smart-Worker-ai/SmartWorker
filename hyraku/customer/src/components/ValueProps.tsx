import React from 'react';
import { motion } from 'framer-motion';
import { Users, Zap, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const ValueProps: React.FC = () => {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: Users,
      title: t('value_verified_title'),
    },
    {
      icon: Zap,
      title: t('value_speed_title'),
    },
    {
      icon: ShieldCheck,
      title: t('value_wage_title'),
    },
    {
      icon: HeartHandshake,
      title: t('value_support_title'),
    },
  ];

  return (
    <section className="bg-white border-b border-sky-100 py-3 sm:py-4">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
                className="flex items-center gap-2 p-2 sm:p-0 rounded-xl bg-sky-50/50 sm:bg-transparent text-slate-800 hover:text-[#0091ea] transition-colors"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white sm:bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0091ea] shrink-0 shadow-sm">
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[11px] sm:text-xs md:text-sm font-bold tracking-tight line-clamp-1">
                  {item.title}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
