"use client";
import { motion } from "framer-motion";

/** Soft fade/slide between pages (re-mounts on every navigation). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <motion.div className="flex flex-1 flex-col" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>{children}</motion.div>;
}
