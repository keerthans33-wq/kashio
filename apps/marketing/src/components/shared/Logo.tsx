import Link from "next/link";

type Props = {
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md" }: Props) {
  return (
    <Link href="/" className="inline-flex items-center gap-0.5 font-bold tracking-tight select-none">
      <span className={SIZE[size]} style={{ color: "var(--text-primary)" }}>
        kash
      </span>
      <span className={SIZE[size]} style={{ color: "var(--accent-green)" }}>
        io
      </span>
    </Link>
  );
}
