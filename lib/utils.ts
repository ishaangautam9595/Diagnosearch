import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(d: Date | string, withTime = false): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));
}

export function timeAgo(d: Date | string, now = new Date()): string {
  const diff = now.getTime() - new Date(d).getTime();
  const day = 86_400_000;
  if (diff < 3_600_000) return "less than an hour ago";
  if (diff < day) return `${Math.floor(diff / 3_600_000)} hours ago`;
  const days = Math.floor(diff / day);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

export function formatTurnaround(hours: number | null | undefined): string {
  if (!hours) return "Not specified";
  if (hours < 24) return `${hours} hrs`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
