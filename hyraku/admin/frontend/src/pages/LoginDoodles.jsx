import { useEffect, useRef } from 'react';

function Palette() {
  return (
    <defs>
      <linearGradient id="hy-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8f6ff" />
        <stop offset="100%" stopColor="#7ec8ea" />
      </linearGradient>
      <linearGradient id="hy-wall" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f7fbff" />
        <stop offset="100%" stopColor="#d7edf8" />
      </linearGradient>
      <linearGradient id="hy-wall-d" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e4f3fb" />
        <stop offset="100%" stopColor="#c5e3f2" />
      </linearGradient>
      <linearGradient id="hy-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d6ebf6" />
        <stop offset="100%" stopColor="#b7d7ea" />
      </linearGradient>
      <linearGradient id="hy-navy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3d5a73" />
        <stop offset="100%" stopColor="#1b3348" />
      </linearGradient>
      <linearGradient id="hy-shirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4db3e8" />
        <stop offset="100%" stopColor="#0277bd" />
      </linearGradient>
      <linearGradient id="hy-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d4b08a" />
        <stop offset="100%" stopColor="#9a6b43" />
      </linearGradient>
      <linearGradient id="hy-metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e8eef3" />
        <stop offset="100%" stopColor="#7b8b99" />
      </linearGradient>
      <radialGradient id="hy-glow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
    </defs>
  );
}

function Head({ cx = 0, cy = 0, dir = 1, skin = '#e4b892', hair = '#2a2420', tone = '#c99468' }) {
  const e = cx + dir * 4;
  return (
    <g>
      <rect x={cx - 4} y={cy + 11} width="8" height="9" rx="2.5" fill={tone} />
      <ellipse cx={cx} cy={cy} rx="12" ry="14.5" fill={skin} />
      <ellipse cx={cx - dir * 11} cy={cy + 2} rx="2.4" ry="3.4" fill={tone} />
      <path d={`M${cx - dir * 10} ${cy - 2} C${cx - dir * 12} ${cy - 16} ${cx + dir * 2} ${cy - 20} ${cx + dir * 12} ${cy - 10} C${cx + dir * 14} ${cy - 2} ${cx + dir * 8} ${cy + 6} ${cx + dir * 6} ${cy + 8} C${cx + dir * 2} ${cy - 6} ${cx - dir * 6} ${cy - 8} ${cx - dir * 10} ${cy - 2}Z`} fill={hair} />
      <path d={`M${e - 3} ${cy - 4} q${dir * 6} -2.2 ${dir * 8} 0.4`} stroke="#4a3728" strokeWidth="1.15" fill="none" strokeLinecap="round" />
      <ellipse cx={e} cy={cy + 1} rx="1.7" ry="2" fill="#2c241c" />
      <ellipse cx={e + dir * 0.4} cy={cy + 0.3} rx="0.55" ry="0.55" fill="#f8f4ef" />
      <path d={`M${e + dir * 1} ${cy + 2} l${dir * 3.2} 3.6`} stroke={tone} strokeWidth="1.25" fill="none" strokeLinecap="round" />
      <path d={`M${e - dir * 0.5} ${cy + 9} q${dir * 3.5} 2.2 ${dir * 6.5} -0.2`} stroke="#b07060" strokeWidth="1.15" fill="none" strokeLinecap="round" />
    </g>
  );
}

function WorkerStand({ x = 0, y = 0, dir = 1, skin, hair, tool = 'mop' }) {
  const tone = skin === '#c9956c' ? '#a8724a' : skin === '#8d6e4c' ? '#6b4f35' : '#c99468';
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="168" rx="22" ry="5" fill="#0369a1" opacity="0.1" />
      <path d={`M${-18 * dir} 160 h16 l2 5 h-20z`} fill="#1e293b" />
      <path d={`M${6 * dir} 160 h18 l1 5 h-20z`} fill="#0f172a" />
      <path d={`M${-10 * dir} 92 L${-12 * dir} 160`} stroke="#1e3a5f" strokeWidth="11" strokeLinecap="round" />
      <path d={`M${8 * dir} 92 L${10 * dir} 160`} stroke="#152a40" strokeWidth="11" strokeLinecap="round" />
      <path d="M-16 86 h32 v10 h-32z" fill="url(#hy-navy)" />
      <path d="M-18 48 C-20 54 -18 84 -14 88 h28 C18 84 20 54 16 48 Q0 42 -18 48Z" fill="url(#hy-shirt)" />
      <path d="M-4 48 L0 58 L4 48" fill="#eaf6fc" />
      <path d={`M${-16 * dir} 56 C${-30 * dir} 78 ${-28 * dir} 108 ${-22 * dir} 126`} stroke="#039be5" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse cx={-22 * dir} cy="128" rx="5" ry="4" fill={skin} />
      <path d={`M${16 * dir} 56 C${30 * dir} 72 ${32 * dir} 108 ${26 * dir} 130`} stroke="#0277bd" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse cx={26 * dir} cy="132" rx="5" ry="4" fill={skin} />
      <Head cx={2 * dir} cy={28} dir={dir} skin={skin} hair={hair} tone={tone} />
      {tool === 'mop' && (
        <g>
          <path d={`M${26 * dir} 8 L${28 * dir} 148`} stroke="#5b6b78" strokeWidth="2.2" />
          <rect x={26 * dir - 14} y="2" width="28" height="8" rx="2" fill="#8a99a6" />
          <path d={`M${14 * dir} 148 h${24 * dir}`} stroke="#5b6b78" strokeWidth="3" strokeLinecap="round" />
          <path d={`M${14 * dir} 148 q${12 * dir} 10 ${24 * dir} 0`} fill="#9aa8b4" />
        </g>
      )}
      {tool === 'box' && (
        <g>
          <rect x={18 * dir - 2} y="96" width="28" height="20" rx="2" fill="#c9854a" />
          <rect x={18 * dir - 2} y="96" width="28" height="6" fill="#e0a86a" />
        </g>
      )}
      {tool === 'roller' && (
        <g>
          <path d={`M${26 * dir} 132 L${28 * dir} 44`} stroke="#64748b" strokeWidth="2.4" />
          <rect x={28 * dir - 4} y="18" width="8" height="28" rx="3" fill="#0284c7" />
        </g>
      )}
    </g>
  );
}

function WorkerReach({ x = 0, y = 0, dir = 1, skin, hair }) {
  const tone = '#c99468';
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="176" rx="20" ry="5" fill="#0369a1" opacity="0.1" />
      <rect x="-26" y="158" width="52" height="7" rx="1" fill="#8a99a6" />
      <rect x="-12" y="132" width="10" height="26" fill="#c5d0da" />
      <rect x="4" y="132" width="10" height="26" fill="#b7c2cc" />
      <path d="M-10 88 L-8 132" stroke="#1e3a5f" strokeWidth="11" strokeLinecap="round" />
      <path d="M8 88 L10 132" stroke="#152a40" strokeWidth="11" strokeLinecap="round" />
      <path d="M-16 48 C-18 56 -16 84 -12 88 h24 C16 84 18 56 14 48 Q0 42 -16 48Z" fill="url(#hy-shirt)" />
      <path d={`M${-14 * dir} 56 C${-24 * dir} 78 ${-22 * dir} 104 ${-16 * dir} 118`} stroke="#039be5" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d={`M${14 * dir} 54 C${20 * dir} 28 ${18 * dir} 4 ${14 * dir} -16`} stroke="#0277bd" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse cx={14 * dir} cy="-18" rx="5" ry="4" fill={skin} />
      <rect x={14 * dir - 3} y="-42" width="6" height="22" rx="1" fill="url(#hy-metal)" />
      <Head cx={2 * dir} cy={28} dir={dir} skin={skin} hair={hair} tone={tone} />
    </g>
  );
}

function WorkerKneel({ x = 0, y = 0, dir = 1, skin, hair }) {
  const tone = '#a8724a';
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="8" cy="118" rx="28" ry="6" fill="#0369a1" opacity="0.1" />
      <path d="M-8 114 L-22 70 L2 58 L18 114Z" fill="url(#hy-navy)" />
      <path d="M18 114 L36 64 L58 74 L48 114Z" fill="#152a40" />
      <path d="M-16 70 L-20 28 L24 12 L40 58Z" fill="url(#hy-shirt)" />
      <path d={`M${20 * dir} 22 C${44 * dir} 8 ${58 * dir} -10 ${62 * dir} -28`} stroke="#0277bd" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse cx={62 * dir} cy="-30" rx="5" ry="4" fill={skin} />
      <path d={`M${58 * dir} -38 l${18 * dir} -8 ${4 * dir} 10 ${-16 * dir} 6z`} fill="url(#hy-metal)" />
      <path d={`M${-18 * dir} 40 C${-36 * dir} 54 ${-40 * dir} 82 ${-32 * dir} 100`} stroke="#039be5" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Head cx={8 * dir} cy={-8} dir={dir} skin={skin} hair={hair} tone={tone} />
    </g>
  );
}

function RoomShell({ w = 280, h = 210 }) {
  return (
    <g>
      <rect x="8" y="8" width={w} height={h} rx="4" fill="url(#hy-wall)" />
      <rect x="8" y={8 + h} width={w} height="48" fill="url(#hy-floor)" />
      <path d={`M8 ${8 + h} h${w}`} stroke="#9fc9dc" strokeWidth="1.4" />
    </g>
  );
}

function IsoRoom() {
  return (
    <g>
      <path d="M12 200 L150 268 L288 200 L150 132 Z" fill="url(#hy-floor)" />
      <path d="M12 200 L150 132 L150 16 L12 84 Z" fill="url(#hy-wall)" />
      <path d="M150 132 L288 200 L288 84 L150 16 Z" fill="url(#hy-wall-d)" />
    </g>
  );
}

function Window({ x, y, w = 88, h = 100, clip }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {clip && (
        <defs>
          <clipPath id={clip}><rect width={w} height={h} rx="2" /></clipPath>
        </defs>
      )}
      <g clipPath={clip ? `url(#${clip})` : undefined}>
        <rect width={w} height={h} fill="url(#hy-sky)" />
        <path className="hy-light" d={`M0 0 h${w} v${h} h${-w}z`} fill="url(#hy-glow)" />
      </g>
      <rect x="-3" y="-3" width={w + 6} height={h + 6} fill="none" stroke="#7aa3b8" strokeWidth="3.5" />
      <path d={`M${w / 2} -3 v${h + 6}`} stroke="#7aa3b8" strokeWidth="2.5" />
      <path className="hy-sheer" d={`M1 0 h14 v${h} h-14z`} fill="#f8fbff" opacity="0.5" />
    </g>
  );
}

function CleanerScene() {
  return (
    <g>
      <IsoRoom />
      <Window x="42" y="40" clip="hy-win-a" />
      <path d="M176 148 L250 186 L250 150 L176 112 Z" fill="#8fbdd4" />
      <path d="M176 112 L250 150 L276 136 L202 98 Z" fill="#a9d0e2" />
      <path d="M250 150 L276 136 L276 172 L250 186 Z" fill="#6ea3bc" />
      <path d="M236 98 v-22" stroke="#5f7d68" strokeWidth="2" />
      <ellipse cx="236" cy="68" rx="16" ry="11" fill="#5f8f6e" />
      <WorkerStand x="118" y="108" dir={1} skin="#e4b892" hair="#2a2420" tool="mop" />
    </g>
  );
}

function PlumbingScene() {
  return (
    <g>
      <RoomShell w="268" h="188" />
      <rect x="86" y="70" width="160" height="12" fill="#eaf4fa" stroke="#b7d0de" />
      <rect x="94" y="40" width="144" height="30" rx="2" fill="#f7fbfe" stroke="#b7d0de" />
      <rect x="150" y="26" width="30" height="16" rx="2" fill="url(#hy-metal)" />
      <path d="M165 26 v-10" stroke="#7d8b97" strokeWidth="4" strokeLinecap="round" />
      <path d="M156 16 h18" stroke="#7d8b97" strokeWidth="4" strokeLinecap="round" />
      <rect x="94" y="82" width="144" height="114" fill="#c9dfea" stroke="#a8c2d1" />
      <path d="M166 82 v114" stroke="#a8c2d1" />
      <path d="M94 82 L52 72 L52 188 L94 196 Z" fill="#e7f2f8" stroke="#a8c2d1" />
      <path d="M166 82 v36" stroke="#9a5b32" strokeWidth="6" strokeLinecap="round" />
      <path d="M166 118 h-26 v22" stroke="#9a5b32" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="140" cy="140" r="7" fill="none" stroke="#9a5b32" strokeWidth="5" />
      <path className="hy-drip" d="M140 148 v10" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
      <WorkerKneel x="148" y="196" dir={1} skin="#c9956c" hair="#3f2e22" />
      <g transform="translate(214 206)">
        <rect x="0" y="8" width="50" height="26" rx="3" fill="#1e4e6a" />
        <rect x="0" y="16" width="50" height="5" fill="#0284c7" />
        <path d="M16 8 v-10 h18 v10" stroke="#1e4e6a" strokeWidth="5" fill="none" />
      </g>
    </g>
  );
}

function ElectricalScene() {
  return (
    <g>
      <RoomShell w="200" h="200" />
      <rect x="28" y="28" width="24" height="30" rx="1" fill="#d7eaf4" stroke="#9cb9c9" />
      <rect x="28" y="66" width="24" height="30" rx="1" fill="#d7eaf4" stroke="#9cb9c9" />
      <rect x="96" y="24" width="78" height="96" rx="3" fill="#eef6fb" stroke="#7aa3b8" strokeWidth="2.4" />
      <rect x="106" y="36" width="58" height="72" rx="2" fill="#1b3348" />
      {[0, 1, 2, 3].map((r) => [0, 1].map((c) => (
        <rect key={`${r}${c}`} x={114 + c * 22} y={44 + r * 14} width="16" height="8" rx="1" fill="#67c6e8" />
      )))}
      <WorkerReach x="108" y="48" dir={1} skin="#e4b892" hair="#1f2933" />
    </g>
  );
}

function EntryScene() {
  return (
    <g>
      <RoomShell w="188" h="210" />
      <rect x="48" y="24" width="108" height="194" rx="2" fill="#d5e8f3" stroke="#7aa3b8" strokeWidth="6" />
      <rect x="60" y="40" width="84" height="164" rx="1" fill="url(#hy-wood)" />
      <rect x="66" y="48" width="34" height="72" rx="1" fill="#c49a6c" />
      <rect x="104" y="48" width="34" height="72" rx="1" fill="#c49a6c" />
      <rect x="66" y="126" width="34" height="70" rx="1" fill="#b08458" />
      <rect x="104" y="126" width="34" height="70" rx="1" fill="#b08458" />
      <circle cx="136" cy="128" r="4" fill="url(#hy-metal)" />
      <g transform="translate(168 176)">
        <rect x="4" y="18" width="60" height="30" rx="3" fill="#e8f4fb" stroke="#8fb6cb" />
        <path d="M4 18 L14 6 h40 L56 18" fill="#d5eaf6" stroke="#8fb6cb" />
        <rect x="12" y="8" width="10" height="12" rx="1" fill="#7dd3fc" />
        <rect x="26" y="4" width="10" height="16" rx="1" fill="#38bdf8" />
        <rect x="40" y="10" width="10" height="10" rx="1" fill="#0284c7" />
        <circle cx="14" cy="52" r="6" fill="#5b6b78" />
        <circle cx="52" cy="52" r="6" fill="#5b6b78" />
      </g>
    </g>
  );
}

function PainterScene() {
  return (
    <g>
      <RoomShell w="210" h="196" />
      <rect x="28" y="28" width="70" height="120" rx="2" fill="#dbeaf3" />
      <rect x="108" y="28" width="70" height="80" rx="2" fill="#c5e0ef" />
      <WorkerStand x="118" y="88" dir={-1} skin="#c9956c" hair="#3f2e22" tool="roller" />
    </g>
  );
}

function DeliveryScene() {
  return (
    <g>
      <RoomShell w="210" h="170" />
      <rect x="24" y="36" width="52" height="70" rx="2" fill="#d7eaf4" stroke="#9cb9c9" />
      <WorkerStand x="120" y="62" dir={-1} skin="#8d6e4c" hair="#2a2420" tool="box" />
    </g>
  );
}

function LaundryScene() {
  return (
    <g>
      <RoomShell w="180" h="160" />
      <rect x="40" y="70" width="70" height="86" rx="6" fill="#e8f4fb" stroke="#8fb6cb" />
      <circle cx="75" cy="118" r="22" fill="#d0e4ef" stroke="#8fb6cb" />
      <circle cx="75" cy="118" r="12" fill="#f8fbff" />
      <rect x="118" y="96" width="40" height="60" rx="3" fill="#b8d4e4" />
    </g>
  );
}

function GardenScene() {
  return (
    <g>
      <rect x="8" y="70" width="180" height="70" rx="4" fill="url(#hy-floor)" />
      <ellipse cx="48" cy="86" rx="22" ry="14" fill="#5f8f6e" />
      <ellipse cx="70" cy="80" rx="16" ry="12" fill="#7eae86" />
      <rect x="96" y="40" width="14" height="50" rx="2" fill="#c4a07a" />
      <ellipse cx="103" cy="36" rx="28" ry="18" fill="#5f8f6e" />
      <ellipse cx="148" cy="88" rx="20" ry="13" fill="#6b9a7a" />
    </g>
  );
}

function LadderScene() {
  return (
    <g>
      <RoomShell w="150" h="190" />
      <path d="M40 28 v150 M88 28 v150" stroke="url(#hy-wood)" strokeWidth="6" strokeLinecap="round" />
      <path d="M40 52 h48 M40 80 h48 M40 108 h48 M40 136 h48 M40 164 h48" stroke="#b8895e" strokeWidth="4" />
    </g>
  );
}

function Facade() {
  return (
    <g fill="none" stroke="#7eb6d0" strokeWidth="1.15" opacity="0.55">
      <path d="M20 78 h200 v-46 h-36 l-18 -16 h-72 l-18 16 h-56 z" />
      <rect x="36" y="46" width="20" height="20" />
      <rect x="66" y="46" width="20" height="20" />
      <rect x="96" y="46" width="20" height="20" />
      <rect x="126" y="46" width="20" height="20" />
      <rect x="156" y="40" width="26" height="38" />
      <path d="M240 82 h160 v-40 h-24 l-14 -14 h-64 l-14 14 h-44 z" />
      <rect x="256" y="54" width="16" height="16" />
      <rect x="280" y="54" width="16" height="16" />
      <rect x="304" y="54" width="16" height="16" />
      <rect x="328" y="50" width="22" height="32" />
    </g>
  );
}

const PLACED = [
  { id: 'a', layer: 'mid', node: <CleanerScene />, box: '0 0 300 300' },
  { id: 'b', layer: 'near', node: <ElectricalScene />, box: '0 0 220 270' },
  { id: 'c', layer: 'far', node: <GardenScene />, box: '0 0 200 150' },
  { id: 'd', layer: 'far', node: <LaundryScene />, box: '0 0 200 230' },
  { id: 'e', layer: 'mid', node: <PainterScene />, box: '0 0 230 270' },
  { id: 'f', layer: 'mid', node: <DeliveryScene />, box: '0 0 230 240' },
  { id: 'g', layer: 'near', node: <EntryScene />, box: '0 0 250 280' },
  { id: 'h', layer: 'mid', node: <PlumbingScene />, box: '0 0 300 280' },
  { id: 'i', layer: 'far', node: <GardenScene />, box: '0 0 200 150' },
  { id: 'j', layer: 'far', node: <LaundryScene />, box: '0 0 200 230' },
  { id: 'k', layer: 'near', node: <LadderScene />, box: '0 0 170 260' },
  { id: 'l', layer: 'far', node: <GardenScene />, box: '0 0 200 150' },
];

export default function LoginDoodles() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} className="login-scenes" aria-hidden="true">
      <div className="login-ambient" />
      <div className="login-facade login-layer-far">
        <svg viewBox="0 0 420 100"><Facade /></svg>
      </div>
      <div className="login-facade login-facade-c login-layer-far">
        <svg viewBox="0 0 420 100"><Facade /></svg>
      </div>
      <div className="login-facade login-facade-r login-layer-far">
        <svg viewBox="0 0 420 100"><Facade /></svg>
      </div>
      {PLACED.map((item) => {
        const parts = item.box.split(' ').map(Number);
        return (
          <div
            key={item.id}
            className={`login-scene login-v-${item.id} login-layer-${item.layer}`}
            style={{ aspectRatio: `${parts[2]} / ${parts[3]}` }}
          >
            <svg viewBox={item.box} preserveAspectRatio="xMidYMid meet">
              <Palette />
              {item.node}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
