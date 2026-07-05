"use client";

import { motion, useReducedMotion } from "motion/react";
import CountUp from "@/components/motion/CountUp";
import BankLogo from "@/components/BankLogo";

type Stat = { value: string; label: string; countTo?: number; suffix?: string };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

/** Card-detail header with staggered entrance + count-up on the numeric stat tile. */
export default function CardDetailHeader({
  cardType,
  bank,
  network,
  name,
  stats,
  feeWaiverSpend,
}: {
  cardType: string;
  bank: string;
  network: string;
  name: string;
  stats: Stat[];
  feeWaiverSpend: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="mt-4 rounded-2xl border border-border bg-surface2 p-7"
      variants={container}
      initial={reduce ? "show" : "hidden"}
      animate="show"
    >
      <motion.div variants={item} className="flex flex-wrap items-center gap-2.5">
        <BankLogo bank={bank} name={name} size={40} />
        <span className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-bold uppercase text-onaccent">
          {cardType}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {bank} · {network}
        </span>
      </motion.div>
      <motion.h1 variants={item} className="mt-3 text-3xl font-black sm:text-4xl">
        {name}
      </motion.h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <motion.div key={s.label} variants={item} className="rounded-xl border border-border bg-surface p-3">
            {s.countTo != null ? (
              <CountUp to={s.countTo} suffix={s.suffix ?? ""} className="text-lg font-extrabold text-green" />
            ) : (
              <div className="text-lg font-extrabold text-green">{s.value}</div>
            )}
            <div className="mt-0.5 text-[11px] text-muted">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {feeWaiverSpend > 0 && (
        <motion.p variants={item} className="mt-4 text-sm text-subtle">
          💡 Annual fee waiver: ₹{feeWaiverSpend.toLocaleString("en-IN")}/year spend karne pe fee maaf.
        </motion.p>
      )}
    </motion.div>
  );
}
