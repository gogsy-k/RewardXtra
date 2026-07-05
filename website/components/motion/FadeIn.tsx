"use client";

import { createContext, useContext } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/*
 * Reusable fade-up primitives.
 *   <FadeIn>            — single element, fades up once when scrolled into view.
 *   <FadeInStagger>     — container that sequences its <FadeIn> children ~80ms apart.
 * Both honor prefers-reduced-motion (render a plain <div>, no animation).
 * (The site's live sections currently use the equivalent <Reveal>; these are the
 *  named wrappers per spec and share the same easing/timing.)
 */

const StaggerContext = createContext(false);

const variants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
const transition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };

export function FadeIn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const inStagger = useContext(StaggerContext);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={variants}
      transition={transition}
      // Standalone: trigger itself once in view. Inside a stagger: the parent orchestrates.
      {...(inStagger
        ? {}
        : { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.3 } })}
    >
      {children}
    </motion.div>
  );
}

export function FadeInStagger({
  children,
  className,
  faster = false,
}: {
  children: ReactNode;
  className?: string;
  faster?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <StaggerContext.Provider value={true}>
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ staggerChildren: faster ? 0.05 : 0.08 }}
      >
        {children}
      </motion.div>
    </StaggerContext.Provider>
  );
}
