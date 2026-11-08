"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface ApiState<T> {
  data: T | null;
  /** First load in flight (no data yet). */
  loading: boolean;
  /** A background refresh is in flight (data is still shown). */
  refreshing: boolean;
  error: string | null;
  updatedAt: Date | null;
  reload: () => void;
}

/**
 * Fetches JSON from our own API and keeps it fresh: refetches on an interval and when the tab becomes visible again.
 * Previously loaded data stays on screen while refreshing or after a failed refresh (the error is shown alongside).
 */
export function useApi<T>(url: string, { intervalMs = 30_000 }: { intervalMs?: number } = {}): ApiState<T> {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const hasData = useRef(false);

  const load = useCallback(async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    if (hasData.current) setRefreshing(true);
    try {
      const res = await fetch(url, { signal: c.signal, cache: "no-store", headers: { Accept: "application/json" } });
      if (res.status === 401) { router.replace("/login"); return; }
      if (!res.ok) throw new Error(res.status === 403 ? "You don't have access to this data." : "Couldn't load the latest data.");
      const json = (await res.json()) as T;
      hasData.current = true;
      setData(json); setError(null); setUpdatedAt(new Date());
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message || "Couldn't load the latest data.");
    } finally {
      if (ctrl.current === c) { setLoading(false); setRefreshing(false); }
    }
  }, [url, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const tick = setInterval(() => { if (document.visibilityState === "visible") void load(); }, intervalMs);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onVisible); ctrl.current?.abort(); };
  }, [load, intervalMs]);

  return { data, loading, refreshing, error, updatedAt, reload: () => void load() };
}
