"use client";
import { useRef } from "react";
import { useInView } from "framer-motion";
import { AnimatedNumber } from "@/components/charts/animated-number";

/** Counts up the first time it scrolls into view. */
export function CountUp({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  return <span ref={ref} className={className}><AnimatedNumber value={seen ? value : 0} duration={1.4} />{suffix}</span>;
}
