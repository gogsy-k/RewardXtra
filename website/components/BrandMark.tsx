import { useId } from "react";

/**
 * CardWiz brand mark — indigo tile, white card, green chip + sparkle.
 * Mirrors app/icon.svg (the favicon master) so UI + favicon stay in sync.
 * Crisp at any size; gradient IDs are per-instance (useId) so multiple
 * marks on one page never clash. Works in server + client components.
 */
export default function BrandMark({
  className,
  size = 20,
  title = "CardWiz",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  // Strip colons from React's useId (":r0:") — colons in an id break SVG
  // url(#…) gradient refs in some browsers, rendering the mark as a black blob.
  const uid = useId().replace(/:/g, "");
  const t = `t${uid}`;
  const c = `c${uid}`;
  const g = `g${uid}`;
  const s = `s${uid}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={t} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A83FF" />
          <stop offset="0.52" stopColor="#6060F0" />
          <stop offset="1" stopColor="#2E2A78" />
        </linearGradient>
        <linearGradient id={c} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E7EAFF" />
        </linearGradient>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5FE7B4" />
          <stop offset="1" stopColor="#30CC96" />
        </linearGradient>
        <radialGradient id={s} cx="0.3" cy="0.15" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="128" height="128" rx="29" fill={`url(#${t})`} />
      <rect width="128" height="128" rx="29" fill={`url(#${s})`} />
      <g transform="rotate(-12 64 66)">
        <rect x="26" y="47" width="77" height="52" rx="9" fill={`url(#${c})`} />
        <rect x="35" y="59" width="16" height="12.5" rx="3" fill={`url(#${g})`} />
        <path d="M43 59 V71.5 M35 65.2 H51" stroke="#0A0F1A" strokeOpacity="0.14" strokeWidth="1" />
        <rect x="35" y="82" width="59" height="4.5" rx="2.25" fill="#6060F0" opacity="0.32" />
        <rect x="35" y="82" width="30" height="4.5" rx="2.25" fill="#6060F0" opacity="0.22" />
      </g>
      <g>
        <path
          d="M100 15 C100 30,100 33,121 37 C100 41,100 44,100 59 C100 44,100 41,79 37 C100 33,100 30,100 15 Z"
          fill={`url(#${g})`}
        />
        <circle cx="100" cy="37" r="3.4" fill="#EAFBF3" />
        <path
          d="M116 55 C116 61,116 62,124 63.5 C116 65,116 66,116 72 C116 66,116 65,108 63.5 C116 62,116 61,116 55 Z"
          fill="#7CEBC4"
        />
      </g>
    </svg>
  );
}
