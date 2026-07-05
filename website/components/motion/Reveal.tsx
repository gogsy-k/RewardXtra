"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Scroll-reveal: fade + slide-up (+ optional slight scale), fires once. Honors prefers-reduced-motion. */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
  scale = 1,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Initial scale to animate up from (e.g. 0.96 for a subtle scale-in). Default 1 = no scale. */
  scale?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
