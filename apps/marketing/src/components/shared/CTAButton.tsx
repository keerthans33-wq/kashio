import { cn } from "@/lib/utils";

const APP_URL = "https://app.kashio.com.au";

type Variant = "primary" | "outline" | "ghost";

type Props = {
  label?:    string;
  variant?:  Variant;
  size?:     "sm" | "md" | "lg";
  className?: string;
};

const BASE =
  "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white shadow-md hover:shadow-lg active:scale-[0.98]",
  outline:
    "border-2 bg-transparent hover:bg-opacity-5 active:scale-[0.98]",
  ghost:
    "bg-transparent hover:bg-opacity-5 active:scale-[0.98]",
};

const SIZES = {
  sm: "px-5 py-2 text-sm",
  md: "px-7 py-2.5 text-base",
  lg: "px-9 py-3.5 text-base",
};

export function CTAButton({
  label = "Get started free",
  variant = "primary",
  size = "md",
  className,
}: Props) {
  const style =
    variant === "primary"
      ? { background: "linear-gradient(135deg, var(--accent-green), var(--accent-teal))" }
      : variant === "outline"
      ? { borderColor: "var(--accent-green)", color: "var(--accent-green)" }
      : { color: "var(--text-secondary)" };

  return (
    <a
      href={APP_URL}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      style={style}
    >
      {label}
    </a>
  );
}
