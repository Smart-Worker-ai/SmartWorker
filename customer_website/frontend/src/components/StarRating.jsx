import { Star } from 'lucide-react';

export default function StarRating({ value = 0, size = 16, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="inline-flex items-center gap-0.5">
      {stars.map((n) => {
        const filled = n <= Math.round(value);
        const Cmp = onChange ? 'button' : 'span';
        return (
          <Cmp
            key={n}
            type={onChange ? 'button' : undefined}
            onClick={onChange ? () => onChange(n) : undefined}
            className={onChange ? 'cursor-pointer' : ''}
            aria-label={onChange ? `Rate ${n}` : undefined}
          >
            <Star
              size={size}
              className={filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
            />
          </Cmp>
        );
      })}
    </div>
  );
}
