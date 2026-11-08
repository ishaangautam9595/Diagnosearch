"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** Counts up to `value` when it appears or changes. Respects reduced-motion. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), duration = 0.9, className }: {
  value: number; format?: (n: number) => string; duration?: number; className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const prev = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { prev.current = value; return; } // the displayed value is derived from `value` below
    const c = animate(prev.current, value, { duration, ease: "easeOut", onUpdate: (v) => setShown(v), onComplete: () => { prev.current = value; } });
    return () => c.stop();
  }, [value, duration, reduce]);
  return <span className={className}>{format(reduce ? value : shown)}</span>;
}
