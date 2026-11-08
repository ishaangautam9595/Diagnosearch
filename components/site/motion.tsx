"use client";
import { MotionConfig, motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

/** App-wide: honour the visitor's "reduce motion" setting. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fade + rise on mount (use for page sections). */
export function Reveal({ children, delay = 0, className, ...rest }: { children: ReactNode; delay?: number; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay }} className={className} {...rest}>{children}</motion.div>;
}

/** Children rise in one after another. */
export function Stagger({ children, className, gap = 0.07 }: { children: ReactNode[]; className?: string; gap?: number }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children.map((c, i) => <motion.div key={i} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>{c}</motion.div>)}
    </motion.div>
  );
}

/** Fade + rise when scrolled into view (once). */
export function InView({ children, delay = 0, className, y = 22 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

/** Children rise in one after another when scrolled into view. */
export function InViewStagger({ children, className, gap = 0.1 }: { children: ReactNode[]; className?: string; gap?: number }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children.map((c, i) => <motion.div key={i} className="h-full" variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}>{c}</motion.div>)}
    </motion.div>
  );
}
