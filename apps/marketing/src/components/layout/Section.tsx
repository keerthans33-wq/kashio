import { cn } from "@/lib/utils";
import { Container } from "./Container";
import type { ReactNode } from "react";

type Props = {
  children:    ReactNode;
  className?:  string;
  narrow?:     boolean;
  id?:         string;
  noPadding?:  boolean;
};

export function Section({ children, className, narrow, id, noPadding }: Props) {
  return (
    <section
      id={id}
      className={cn(
        "relative z-10",
        !noPadding && "py-16 sm:py-24",
        className,
      )}
    >
      <Container narrow={narrow}>{children}</Container>
    </section>
  );
}
