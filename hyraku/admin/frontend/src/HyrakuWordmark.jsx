export default function HyrakuWordmark({ variant = 'blue', className = 'h-7 w-auto' }) {
  const src = variant === 'white' ? '/assets/hyraku-logo-white.png' : '/assets/hyraku-logo-blue.png';
  return (
    <img
      src={src}
      alt="Hyraku"
      className={`object-contain object-left select-none ${className}`}
      draggable={false}
    />
  );
}
