import { NJ_STATE_PATH } from './nj-geometry';

/**
 * Hero illustration: a bottom-load dispenser, a standing 5-gallon bottle, and
 * a hand truck loaded with two more — the actual equipment of a 5-gallon
 * delivery route, drawn flat and clean. The accurate New Jersey outline sits
 * faintly in the background as decoration (not a service map).
 */

/** One 5-gallon bottle. Local coords: 88 wide × 158 tall (cap at the top). */
function Jug({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* cap */}
      <rect x="27" y="0" width="34" height="16" rx="5" fill="#0B2945" />
      {/* neck */}
      <rect x="30" y="13" width="28" height="16" fill="#7FCFE8" />
      {/* shoulder */}
      <path d="M12 54 Q12 28 36 27 h16 Q76 28 76 54 Z" fill="url(#gsw-jug)" />
      {/* body */}
      <rect x="6" y="50" width="76" height="108" rx="13" fill="url(#gsw-jug)" />
      {/* handle indent */}
      <rect x="30" y="34" width="28" height="7" rx="3.5" fill="#0B2945" opacity="0.18" />
      {/* ribs */}
      <rect x="10" y="82" width="68" height="4" rx="2" fill="#0B2945" opacity="0.1" />
      <rect x="10" y="104" width="68" height="4" rx="2" fill="#0B2945" opacity="0.1" />
      <rect x="10" y="126" width="68" height="4" rx="2" fill="#0B2945" opacity="0.1" />
      {/* highlight */}
      <rect x="14" y="58" width="11" height="88" rx="5.5" fill="#FFFFFF" opacity="0.4" />
    </g>
  );
}

export function HeroArt() {
  return (
    <svg
      viewBox="0 0 560 470"
      role="img"
      aria-label="Illustration of five-gallon water delivery equipment: a bottom-load dispenser, a full 5-gallon bottle, and a hand truck stacked with two more bottles"
      className="h-auto w-full max-w-[560px]"
    >
      <defs>
        <linearGradient id="gsw-jug" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ED7ED" />
          <stop offset="1" stopColor="#33A9D1" />
        </linearGradient>
        <linearGradient id="gsw-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E4F6FC" />
          <stop offset="1" stopColor="#D2EEF8" />
        </linearGradient>
      </defs>

      {/* backdrop */}
      <g aria-hidden="true">
        <rect x="14" y="26" width="532" height="408" rx="44" fill="url(#gsw-panel)" />
        {/* faint, geographically accurate New Jersey outline — decorative */}
        <g transform="translate(348 58) scale(0.62)" opacity="0.5">
          <path d={NJ_STATE_PATH} fill="#FFFFFF" stroke="#A9DDEF" strokeWidth="2.5" />
        </g>
        {/* ground shadow */}
        <ellipse cx="278" cy="424" rx="216" ry="17" fill="#B9E2F0" opacity="0.55" />
      </g>

      {/* bottom-load dispenser */}
      <g aria-hidden="true">
        <rect x="104" y="118" width="122" height="304" rx="16" fill="#FFFFFF" />
        <rect x="206" y="126" width="14" height="290" rx="7" fill="#E8F2F7" />
        {/* top panel */}
        <path d="M104 134 a16 16 0 0 1 16-16 h90 a16 16 0 0 1 16 16 v52 h-122 Z" fill="#0B2945" />
        <circle cx="204" cy="140" r="4" fill="#2E9B68" />
        {/* dispensing recess */}
        <rect x="122" y="200" width="86" height="66" rx="9" fill="#0F2C4A" />
        <rect x="136" y="208" width="12" height="18" rx="3" fill="#149BC2" />
        <rect x="158" y="208" width="12" height="18" rx="3" fill="#DFF6FC" />
        <rect x="134" y="252" width="62" height="7" rx="3.5" fill="#52677A" />
        {/* cabinet door hiding the bottle */}
        <rect x="116" y="282" width="98" height="124" rx="10" fill="#F4FBFD" stroke="#D8EAF0" strokeWidth="2" />
        <rect x="132" y="298" width="30" height="6" rx="3" fill="#52677A" />
        {/* feet */}
        <rect x="114" y="418" width="22" height="8" rx="3" fill="#0B2945" />
        <rect x="194" y="418" width="22" height="8" rx="3" fill="#0B2945" />
      </g>

      {/* standing bottle beside the dispenser */}
      <g aria-hidden="true">
        <Jug x={248} y={268} scale={1} />
      </g>

      {/* hand truck with two stacked bottles */}
      <g aria-hidden="true">
        {/* rails behind the bottles */}
        <rect x="404" y="96" width="11" height="310" rx="5.5" fill="#0B2945" />
        <rect x="472" y="96" width="11" height="310" rx="5.5" fill="#0B2945" />
        <path d="M409 100 a10 10 0 0 1 10-10 h49 a10 10 0 0 1 10 10" fill="none" stroke="#0B2945" strokeWidth="11" strokeLinecap="round" />
        <rect x="404" y="196" width="79" height="9" rx="4.5" fill="#0B2945" />
        <rect x="404" y="330" width="79" height="9" rx="4.5" fill="#0B2945" />
        {/* stacked bottles */}
        <Jug x={400} y={148} scale={0.82} />
        <Jug x={400} y={278} scale={0.82} />
        {/* toe plate + wheels */}
        <rect x="380" y="406" width="104" height="10" rx="4" fill="#0B2945" />
        <circle cx="412" cy="424" r="20" fill="#0B2945" />
        <circle cx="412" cy="424" r="9" fill="#52677A" />
        <circle cx="412" cy="424" r="3.5" fill="#DFF6FC" />
        <circle cx="474" cy="424" r="20" fill="#0B2945" />
        <circle cx="474" cy="424" r="9" fill="#52677A" />
        <circle cx="474" cy="424" r="3.5" fill="#DFF6FC" />
      </g>
    </svg>
  );
}
