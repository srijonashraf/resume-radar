const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      className="text-blue-500 opacity-50"
    />
    <circle
      cx="12"
      cy="12"
      r="6"
      stroke="currentColor"
      strokeWidth="2"
      className="text-purple-500 opacity-75"
    />
    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      className="text-green-400 animate-pulse"
    />
    <path
      d="M12 2V12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-blue-400 origin-center animate-[spin_4s_linear_infinite]"
    />
  </svg>
);

export default Logo;
