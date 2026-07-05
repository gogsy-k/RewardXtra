"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export default function AIChatButton() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed bottom-5 right-5 z-50"
      animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
      transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <Link
        href="/ai"
        title="CardWiz AI — card ke baare mein kuch bhi pucho"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-lg transition-transform hover:scale-105"
        aria-label="Open AI chat"
      >
        <span className="text-2xl">🤖</span>
      </Link>
    </motion.div>
  );
}
