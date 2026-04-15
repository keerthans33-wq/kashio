"use client";

import { motion } from "motion/react";

type Props = {
  children:  React.ReactNode;
  delay?:    number;
  className?: string;
  style?:    React.CSSProperties;
};

export function FadeIn({ children, delay = 0, className, style }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
