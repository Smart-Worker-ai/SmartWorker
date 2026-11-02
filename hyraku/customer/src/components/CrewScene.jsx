export default function CrewScene({ compact = false }) {
  const id = compact ? 'crew-m' : 'crew-d';

  return (
    <div className={`crew-stage ${compact ? 'crew-stage-compact' : ''}`} aria-hidden="true">
      <svg
        className="crew-doodle"
        viewBox="0 0 800 520"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b9dcff" />
            <stop offset="100%" stopColor="#eef7ff" />
          </linearGradient>
        </defs>

        <rect width="800" height="520" fill={`url(#${id}-sky)`} />

        <g className="crew-cloud crew-cloud-a" fill="#ffffff">
          <ellipse cx="118" cy="78" rx="46" ry="22" />
          <ellipse cx="150" cy="72" rx="32" ry="18" />
          <ellipse cx="88" cy="74" rx="28" ry="16" />
        </g>
        <g className="crew-cloud crew-cloud-b" fill="#ffffff">
          <ellipse cx="620" cy="64" rx="52" ry="20" />
          <ellipse cx="658" cy="58" rx="30" ry="16" />
          <ellipse cx="590" cy="60" rx="24" ry="14" />
        </g>

        <path d="M40 318 L40 168 Q40 150 62 150 L168 150 Q188 150 188 172 L188 318 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="2.2" />
        <rect x="62" y="172" width="28" height="34" rx="3" fill="#7dd3fc" />
        <rect x="108" y="172" width="28" height="34" rx="3" fill="#38bdf8" />
        <rect x="62" y="220" width="28" height="34" rx="3" fill="#38bdf8" />
        <rect x="108" y="220" width="28" height="34" rx="3" fill="#7dd3fc" />
        <path d="M40 150 L114 108 L188 150 Z" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" />

        <g stroke="#475569" strokeWidth="2" fill="none">
          <rect x="210" y="128" width="120" height="190" fill="#e2e8f0" />
          <path d="M210 158 H330 M210 188 H330 M210 218 H330 M210 248 H330 M210 278 H330" />
          <path d="M240 128 V318 M270 128 V318 M300 128 V318" />
        </g>
        <rect x="222" y="132" width="18" height="10" rx="1" fill="#f97316" />
        <rect x="246" y="132" width="18" height="10" rx="1" fill="#f97316" />
        <rect x="270" y="162" width="18" height="10" rx="1" fill="#f97316" />

        <path d="M620 318 L620 178 Q620 162 640 162 L760 162 Q778 162 778 180 L778 318 Z" fill="#d6d3d1" stroke="#64748b" strokeWidth="2.2" />
        <rect x="648" y="186" width="32" height="40" rx="3" fill="#7dd3fc" />
        <rect x="698" y="186" width="32" height="40" rx="3" fill="#38bdf8" />
        <rect x="648" y="238" width="32" height="40" rx="3" fill="#38bdf8" />
        <rect x="698" y="238" width="32" height="40" rx="3" fill="#7dd3fc" />

        <path d="M742 318 C742 270 768 250 790 238 C770 258 772 288 778 318 Z" fill="#22c55e" />
        <path d="M58 318 C50 276 28 252 8 242 C26 262 34 292 40 318 Z" fill="#16a34a" />

        <rect x="0" y="318" width="800" height="202" fill="#d7c49a" />
        <path d="M0 318 C120 304 240 328 400 314 C560 300 680 326 800 312 L800 340 L0 340 Z" fill="#cbb892" />
        <rect x="96" y="348" width="34" height="14" rx="2" fill="#b45309" transform="rotate(-6 96 348)" />
        <rect x="138" y="352" width="30" height="13" rx="2" fill="#b45309" />
        <rect x="668" y="350" width="32" height="13" rx="2" fill="#b45309" transform="rotate(5 668 350)" />

        <g className="crew-doodle-lead">
          <ellipse cx="318" cy="428" rx="52" ry="12" fill="#000000" opacity="0.16" />
          <path d="M292 414 C290 392 294 372 298 350" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M344 414 C346 392 342 372 338 350" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M278 422 Q286 432 296 428 L288 414 Z" fill="#4b2e16" />
          <path d="M358 422 Q350 432 340 428 L348 414 Z" fill="#4b2e16" />
          <path d="M268 250 C250 268 248 312 256 338 C262 346 272 344 276 334 C272 300 274 268 284 248 Z" fill="#0091ea" stroke="#0369a1" strokeWidth="2.4" />
          <path d="M368 250 C386 268 388 312 380 338 C374 346 364 344 360 334 C364 300 362 268 352 248 Z" fill="#0091ea" stroke="#0369a1" strokeWidth="2.4" />
          <rect x="286" y="236" width="64" height="118" rx="22" fill="#0091ea" stroke="#0369a1" strokeWidth="2.6" />
          <path d="M300 236 L318 254 L336 236 Z" fill="#0369a1" />
          <text x="318" y="302" textAnchor="middle" fill="#ffffff" fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="16">hyraku</text>
          <path d="M372 336 L402 300 L414 308 L384 346 Z" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
          <circle cx="410" cy="296" r="8" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
          <circle cx="318" cy="198" r="36" fill="#f0c28a" stroke="#c9844a" strokeWidth="2.4" />
          <path d="M292 188 C296 176 308 170 318 170 C328 170 340 176 344 188 Z" fill="#3a2314" />
          <circle cx="306" cy="200" r="3.4" fill="#1e293b" />
          <circle cx="330" cy="200" r="3.4" fill="#1e293b" />
          <path d="M310 214 Q318 222 326 214" fill="none" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M278 176 C286 146 350 144 358 176 C348 166 288 166 278 176 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="2.4" />
          <ellipse cx="318" cy="176" rx="46" ry="8" fill="#eab308" stroke="#a16207" strokeWidth="2" />
          <rect x="304" y="152" width="28" height="8" rx="2" fill="#ca8a04" />
        </g>

        <g className="crew-doodle-mate">
          <ellipse cx="486" cy="432" rx="46" ry="11" fill="#000000" opacity="0.14" />
          <path d="M464 418 C462 398 466 380 470 360" stroke="#1e293b" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M508 418 C510 398 506 380 502 360" stroke="#1e293b" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M452 426 Q460 436 468 432 L462 418 Z" fill="#4b2e16" />
          <path d="M520 426 Q512 436 504 432 L510 418 Z" fill="#4b2e16" />
          <path d="M442 268 C428 284 428 322 436 344 C442 350 450 348 452 340 C448 312 448 284 456 266 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="2.2" />
          <path d="M530 266 C544 284 544 322 536 344 C530 350 522 348 520 340 C524 312 524 284 516 266 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="2.2" />
          <rect x="456" y="252" width="60" height="110" rx="20" fill="#0284c7" stroke="#0369a1" strokeWidth="2.4" />
          <path d="M470 252 L486 268 L502 252 Z" fill="#0369a1" />
          <text x="486" y="314" textAnchor="middle" fill="#ffffff" fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="14">hyraku</text>
          <rect x="524" y="328" width="46" height="10" rx="2" fill="#f8fafc" stroke="#64748b" strokeWidth="2" transform="rotate(-18 524 328)" />
          <circle cx="486" cy="216" r="32" fill="#e8b894" stroke="#c9844a" strokeWidth="2.2" />
          <path d="M464 208 C468 196 478 190 486 190 C494 190 504 196 508 208 Z" fill="#1f2937" />
          <circle cx="476" cy="218" r="3" fill="#1e293b" />
          <circle cx="496" cy="218" r="3" fill="#1e293b" />
          <path d="M478 230 Q486 236 494 230" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
          <path d="M452 196 C460 170 512 168 520 196 C510 186 462 186 452 196 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="2.2" />
          <ellipse cx="486" cy="196" rx="40" ry="7" fill="#eab308" stroke="#a16207" strokeWidth="1.8" />
        </g>
      </svg>
    </div>
  );
}
