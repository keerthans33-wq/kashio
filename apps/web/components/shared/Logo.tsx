type Props = {
  height?: number;
  className?: string;
};

export function Logo({ height = 26, className }: Props) {
  return (
    <svg
      height={height}
      viewBox="0 0 110 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kashio"
      className={className}
      style={{ width: "auto" }}
    >
      <defs>
        <linearGradient id="kashio-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>

      <text
        y="21"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif"
        fontSize="22"
        fontWeight="700"
        letterSpacing="-0.4"
      >
        <tspan fill="white">Kash</tspan>
        <tspan fill="url(#kashio-accent)">io</tspan>
      </text>
    </svg>
  );
}
