type Props = {
  height?: number;
  className?: string;
  textColor?: string;
  markColor?: string;
};

export function Logo({
  height    = 88,
  className,
  textColor = "#ffffff",
  markColor = "#22C55E",
}: Props) {
  return (
    <svg
      height={height}
      viewBox="0 0 80 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kashio"
      className={className}
      style={{ width: "auto" }}
    >
      {/* K+arrow mark centred in 80-wide strip — 66×66 icon */}
      <g transform="translate(7, 4)">
        {/* Foot block — bottom-left of K */}
        <rect x="0" y="44" width="28" height="22" fill={markColor} />
        {/* Diagonal shaft + northeast arrowhead */}
        <polygon
          points="12,66 26,66 54,18 66,18 56,2 38,12 44,18 12,66"
          fill={markColor}
        />
        {/* Lower arm — right branch of K */}
        <rect x="32" y="44" width="24" height="22" fill={markColor} />
      </g>

      {/* kashio wordmark */}
      <text
        x="40"
        y="103"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif"
        fontSize="26"
        fontWeight="800"
        letterSpacing="-0.5"
        fill={textColor}
      >
        kashio
      </text>
    </svg>
  );
}
