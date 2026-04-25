import Image from "next/image";

type Props = {
  height?: number;
  className?: string;
};

export function Logo({ height = 88, className }: Props) {
  const width = Math.round(height * (654 / 511));
  return (
    <Image
      src="/logo.svg"
      alt="Kashio"
      width={width}
      height={height}
      className={className}
      unoptimized
    />
  );
}
