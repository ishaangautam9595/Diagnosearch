"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CheckCircle2, MapPin, Store } from "lucide-react";

/**
 * Illustrative product story over a real photo: prescription uploaded → sent to labs within 20 km → offers arrive.
 * Deliberately shows no figures, prices or lab names — it illustrates the flow, it doesn't claim any data.
 */
export function HeroVisual() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v + 1) % 5), 1500);
    return () => clearInterval(t);
  }, []);
  const rows = Math.min(n, 3);
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div aria-hidden className="ds-float-slow absolute -left-6 -top-6 size-40 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="ds-float absolute -bottom-8 -right-4 size-48 rounded-full bg-teal/25 blur-3xl" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative aspect-[4/4.4] overflow-hidden rounded-[2rem] border border-white shadow-2xl shadow-primary-dark/15">
        <Image src="/images/doctor-phone.webp" alt="A doctor checking messages on a phone" fill priority sizes="(min-width: 1024px) 520px, 90vw" className="object-cover object-[60%_30%]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-primary-dark/45 via-transparent to-transparent" />
      </motion.div>

      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="absolute -left-3 top-8 sm:-left-8">
        <div className="ds-float flex items-center gap-3 rounded-2xl border border-border bg-white p-3 pr-4 shadow-xl">
          <span className="grid size-10 place-items-center rounded-xl bg-mint text-primary-dark"><Camera className="size-5" /></span>
          <div className="text-sm"><p className="font-semibold">Prescription uploaded</p><p className="text-xs text-muted">Compressed automatically</p></div>
          <CheckCircle2 className="size-5 text-primary" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="absolute -right-2 top-1/3 sm:-right-8">
        <div className="ds-float flex items-center gap-3 rounded-2xl border border-border bg-white p-3 pr-4 shadow-xl [animation-delay:1.2s]">
          <span className="relative grid size-10 place-items-center rounded-full bg-mint text-primary-dark"><span className="ds-ring absolute inset-0 rounded-full bg-primary/40" /><MapPin className="relative size-5" /></span>
          <div className="text-sm"><p className="font-semibold">Sent to labs within 20 km</p><p className="text-xs text-muted">Every approved lab near you</p></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }} className="absolute -bottom-6 left-3 right-3 sm:left-6 sm:right-auto sm:w-[22rem]">
        <div className="rounded-2xl border border-border bg-white/95 p-3 shadow-2xl backdrop-blur">
          <p className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted">Offers arrive here <span className="text-primary-dark">live</span></p>
          <ul className="space-y-1.5" aria-hidden>
            <AnimatePresence initial={false}>
              {Array.from({ length: rows }).map((_, i) => (
                <motion.li key={i} layout initial={{ opacity: 0, x: -24, height: 0 }} animate={{ opacity: 1, x: 0, height: "auto" }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="flex items-center justify-between rounded-xl bg-mint-soft px-3 py-2">
                  <span className="flex items-center gap-2"><Store className="size-4 text-primary-dark" /><span className="h-2.5 rounded-full bg-primary/25" style={{ width: 70 + i * 22 }} /></span>
                  <span className="h-3 w-12 rounded-full bg-primary-dark/70" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {rows === 0 ? <p className="px-3 py-2 text-xs text-muted">Labs reply with their best price…</p> : null}
        </div>
      </motion.div>
    </div>
  );
}
