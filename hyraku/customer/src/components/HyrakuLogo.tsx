import React from 'react';

interface HyrakuLogoProps {
  variant?: 'blue' | 'white' | 'original';
  className?: string;
  imgClassName?: string;
  showTagline?: boolean;
  taglineClassName?: string;
  onClick?: () => void;
}

export const HyrakuLogo: React.FC<HyrakuLogoProps> = ({
  variant = 'blue',
  className = '',
  imgClassName = 'h-7 sm:h-8 w-auto',
  showTagline = false,
  taglineClassName = 'text-[10px] uppercase font-bold tracking-widest text-slate-400',
  onClick,
}) => {
  const src = variant === 'white' ? '/assets/hyraku-logo-white.png' : '/assets/hyraku-logo-blue.png';

  const content = (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <img
        src={src}
        alt="Hyraku"
        className={`object-contain object-left select-none ${imgClassName}`}
        draggable={false}
      />
      {showTagline && (
        <span className={taglineClassName}>Your Reliable Labour Partner</span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="Hyraku Home"
      >
        {content}
      </button>
    );
  }

  return content;
};
