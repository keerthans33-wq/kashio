import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  children:   ReactNode;
  className?: string;
  narrow?:    boolean;
};

export function Container({ children, className, narrow }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        narrow ? "max-w-3xl" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
