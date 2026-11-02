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
  const fill = variant === 'white' ? '#ffffff' : '#0091ea';

  const content = (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <svg
        viewBox="0 0 168 36"
        className={`object-contain select-none ${imgClassName}`}
        role="img"
        aria-label="Hyraku"
      >
        <text
          x="0"
          y="28"
          fill={fill}
          fontFamily="Outfit, Plus Jakarta Sans, sans-serif"
          fontWeight="800"
          fontSize="30"
          letterSpacing="-0.04em"
        >
          hyraku
        </text>
      </svg>
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
