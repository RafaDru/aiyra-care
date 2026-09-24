/** Ícone simplificado — gradiente Aiyra Care (ver `packages/web/public/brand/logo-icon-dark.svg`). */
export function ChHubCareLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="ch-care-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5BC4" />
          <stop offset="50%" stopColor="#FF7AD4" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="url(#ch-care-grad)" />
      <path
        d="M24 14c-3.5 0-6 2.8-6 6.2 0 4.8 6 9.8 6 9.8s6-5 6-9.8C30 16.8 27.5 14 24 14z"
        fill="#FFE566"
        fillOpacity="0.92"
      />
    </svg>
  )
}
