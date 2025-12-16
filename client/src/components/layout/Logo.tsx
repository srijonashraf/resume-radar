/**
 * Logo component for Resume Radar - AI Resume Analysis App
 * Clean document icon with verification checkmark badge
 */
const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="docStroke" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <linearGradient id="badgeFill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>

    {/* Document body */}
    <path
      d="M6 4C6 2.89543 6.89543 2 8 2H18L26 10V28C26 29.1046 25.1046 30 24 30H8C6.89543 30 6 29.1046 6 28V4Z"
      fill="#1E293B"
      stroke="url(#docStroke)"
      strokeWidth="1.5"
    />

    {/* Document fold */}
    <path
      d="M18 2V8C18 9.10457 18.8954 10 20 10H26"
      stroke="url(#docStroke)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Text lines */}
    <rect x="10" y="14" width="10" height="1.5" rx="0.75" fill="#3B82F6" />
    <rect x="10" y="18" width="12" height="1.5" rx="0.75" fill="#475569" />
    <rect x="10" y="22" width="8" height="1.5" rx="0.75" fill="#475569" />

    {/* Verification badge circle */}
    <circle cx="24" cy="24" r="6" fill="url(#badgeFill)" />

    {/* Checkmark */}
    <path
      d="M21 24L23 26L27 22"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Logo;
