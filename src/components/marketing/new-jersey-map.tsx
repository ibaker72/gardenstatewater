import { NJ_STATE_PATH, NJ_VIEWBOX, NORTH_JERSEY_PATH } from './nj-geometry';

/**
 * Decorative but geographically accurate New Jersey map (US Census 1:10m
 * boundaries via us-atlas). The highlighted region is the real merged shape
 * of the eight North Jersey counties — no invented polygons, no fake pins.
 */
export function NewJerseyMap() {
  return (
    <svg
      viewBox={NJ_VIEWBOX}
      role="img"
      aria-label="Map of New Jersey with the North Jersey region highlighted"
      className="mx-auto h-auto w-full max-w-[290px]"
    >
      <path
        d={NJ_STATE_PATH}
        fill="#EAF7FC"
        stroke="#B9DFEC"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d={NORTH_JERSEY_PATH}
        fill="#149BC2"
        fillOpacity="0.22"
        stroke="#149BC2"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g aria-hidden="true">
        <text
          x="150"
          y="118"
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill="#0B2945"
          fontFamily="inherit"
        >
          North Jersey
        </text>
      </g>
    </svg>
  );
}
