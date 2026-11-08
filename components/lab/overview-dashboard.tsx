"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Clock, Inbox, Lightbulb, MapPinned, Minus, Percent, Send, Trophy, TrendingUp, Wallet } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { ColumnChart, FunnelChart, HBarChart, SegmentedBar } from "@/components/charts/bars";
import { Card } from "@/components/ui/card";
import { ApiStatus, DashboardSkeleton, LoadError } from "@/components/dashboard/api-status";
import { bucketByDay, distanceBands, formatMinutes, pctDelta, priceGap, summarize, type EventRow } from "@/lib/analytics";
import { formatCompactINR, formatINR } from "@/lib/money";
import { useApi } from "@/lib/client/use-api";
import { cn } from "@/lib/utils";

interface Payload { generatedAt: string; events: EventRow[]; branches: unknown[]; openOffers: number; newRequests: number }

const RANGES = [{ days: 7, label: "7 days" }, { days: 30, label: "30 days" }, { days: 90, label: "90 days" }] as const;
const fmtDay = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const tint = (v: string, pct = 14) => ({ background: `color-mix(in srgb, ${v} ${pct}%, white)`, color: v });

/** Lab overview: compact KPI cards, then trend charts. Data comes from GET /api/lab/analytics and refreshes on its own. */
export function LabOverviewDashboard() {
  const api = useApi<Payload>("/api/lab/analytics");
  if (api.loading) return <DashboardSkeleton />;
  if (!api.data) return <LoadError message={api.error ?? "Couldn't load your dashboard."} onRetry={api.reload} />;
  return (
    <>
      <ApiStatus api={api} className="mb-3 justify-end" />
      <Overview events={api.data.events} openOffers={api.data.openOffers} newRequests={api.data.newRequests} />
    </>
  );
}

function Delta({ pct, upIsGood = true }: { pct: number | null; upIsGood?: boolean }) {
  const good = pct == null || pct === 0 ? null : (pct > 0) === upIsGood;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", good === null ? "bg-slate-100 text-slate-600" : good ? "bg-emerald-50 text-[var(--good)]" : "bg-red-50 text-[var(--bad)]")}>
      {pct == null ? <Minus className="size-3" /> : pct > 0 ? <ArrowUpRight className="size-3.5" /> : pct < 0 ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3" />}
      {pct == null ? "New" : `${pct > 0 ? "+" : ""}${pct}%`}
      <span className="sr-only">{good === null ? " no change" : good ? " improvement" : " decline"}</span>
    </span>
  );
}

function Kpi({ i, icon, color, label, value, format, text, delta, upIsGood, caption, feature }: {
  i: number; icon: React.ReactNode; color: string; label: string; value?: number; format?: (n: number) => string; text?: string;
  delta?: number | null; upIsGood?: boolean; caption: string; feature?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 + i * 0.05 }} whileHover={{ y: -3 }}
      className={cn("group relative min-w-0 overflow-hidden rounded-2xl border bg-white p-3.5 transition-shadow hover:shadow-lg hover:shadow-black/5", feature ? "border-transparent bg-gradient-to-br from-[#e4f5f8] to-white ring-1 ring-primary/30" : "border-border")}
    >
      <span aria-hidden className="absolute -right-5 -top-5 size-16 rounded-full opacity-[0.12] transition-transform duration-500 group-hover:scale-125" style={{ background: color }} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="grid size-8 place-items-center rounded-xl" style={tint(color)}>{icon}</span>
        {delta !== undefined ? <Delta pct={delta} upIsGood={upIsGood} /> : null}
      </div>
      <p className="relative mt-2.5 truncate text-xs font-medium text-muted">{label}</p>
      <p className="tabular relative text-2xl font-bold leading-tight tracking-tight text-foreground">
        {value !== undefined ? <AnimatedNumber value={value} format={format} /> : text}
      </p>
      <p className="relative mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{caption}</p>
    </motion.div>
  );
}

function CardTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 font-semibold text-[var(--viz-ink)]"><span className="text-primary-dark">{icon}</span>{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-[var(--viz-ink-3)]">{hint}</p> : null}
    </div>
  );
}

function Overview({ events, openOffers, newRequests }: { events: EventRow[]; openOffers: number; newRequests: number }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const now = useMemo(() => new Date(), []);
  const { current: cur, previous: prev } = useMemo(() => summarize(events, days, now), [events, days, now]);
  const gap = useMemo(() => priceGap(events, days, now), [events, days, now]);
  const daily = useMemo(() => bucketByDay(events, days, now), [events, days, now]);
  const bands = useMemo(() => distanceBands(events, days, now), [events, days, now]);
  const noResponse = Math.max(0, cur.received - cur.offered);
  const revenueBars = useMemo(() => {
    if (days <= 30) return daily.map((d) => ({ label: fmtDay(d.date), value: d.wonValue, sub: `${d.won} booking${d.won === 1 ? "" : "s"}` }));
    const weeks: { label: string; value: number; sub: string }[] = [];
    for (let i = 0; i < daily.length; i += 7) { const w = daily.slice(i, i + 7); weeks.push({ label: fmtDay(w[0].date), value: w.reduce((a, d) => a + d.wonValue, 0), sub: `${w.reduce((a, d) => a + d.won, 0)} bookings · week of ${fmtDay(w[0].date)}` }); }
    return weeks;
  }, [daily, days]);
  const empty = events.length === 0;

  const insights: { icon: React.ReactNode; title: string; text: string; tone: "good" | "tip" }[] = [];
  if (cur.responseRate !== null && cur.received >= 5) {
    const pct = Math.round(cur.responseRate * 100);
    insights.push(pct < 70
      ? { icon: <Send className="size-5" />, tone: "tip", title: `You replied to ${pct}% of requests`, text: "Every request you skip is a booking another lab can win. Aim to answer them all." }
      : { icon: <CheckCircle2 className="size-5" />, tone: "good", title: `You replied to ${pct}% of requests`, text: "Great responsiveness — patients notice labs that answer." });
  }
  if (gap && gap.gapPct > 3) insights.push({ icon: <TrendingUp className="size-5" />, tone: "tip", title: `Your lost bids ran ${gap.gapPct}% higher`, text: `Across ${gap.lostBids} lost bid${gap.lostBids === 1 ? "" : "s"} you averaged ${formatINR(gap.avgYourOffer)} against a winning ${formatINR(gap.avgWinningPrice)}.` });
  if (cur.winRate !== null && cur.winRate >= 0.4) insights.push({ icon: <Trophy className="size-5" />, tone: "good", title: `You won ${Math.round(cur.winRate * 100)}% of decided bids`, text: "Your pricing is landing well with patients nearby." });
  if (cur.avgResponseMin !== null && cur.avgResponseMin > 180) insights.push({ icon: <Clock className="size-5" />, tone: "tip", title: `First replies take ${formatMinutes(cur.avgResponseMin)}`, text: "Patients see offers as they arrive, so quicker replies get seen first." });

  const avgBooking = cur.won ? cur.wonValue / cur.won : null;
  const reveal = (k: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.05 + k * 0.07 } });

  return (
    <div className="viz space-y-7">
      {/* Needs attention */}
      <div className="grid gap-3 md:grid-cols-2">
        <motion.div {...reveal(0)}>
          <Link href="/lab/requests?filter=new" className={cn("group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5", newRequests > 0 ? "border-transparent bg-gradient-to-br from-primary-dark to-primary text-white" : "border-border bg-white")}>
            <span className={cn("relative grid size-12 shrink-0 place-items-center rounded-xl", newRequests > 0 ? "bg-white/20" : "bg-mint text-primary-dark")}>
              {newRequests > 0 ? <span className="ds-ring absolute inset-0 rounded-xl bg-white/30" /> : null}
              <Inbox className="relative size-5" />
            </span>
            <div className="min-w-0">
              <p className="tabular text-3xl font-bold leading-none">{newRequests}</p>
              <p className={cn("mt-2 text-sm font-medium", newRequests > 0 ? "text-white/90" : "text-muted")}>{newRequests === 1 ? "request is" : "requests are"} waiting for your offer</p>
            </div>
            <span className={cn("ml-auto hidden items-center gap-1 text-sm font-semibold sm:flex", newRequests > 0 ? "text-white" : "text-primary-dark")}>{newRequests > 0 ? "Reply now" : "View all"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </motion.div>
        <motion.div {...reveal(1)}>
          <Link href="/lab/requests?filter=quoted" className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={tint("var(--s2)")}><Send className="size-5" /></span>
            <div className="min-w-0">
              <p className="tabular text-3xl font-bold leading-none">{openOffers}</p>
              <p className="mt-1.5 text-sm font-medium text-muted">{openOffers === 1 ? "offer is" : "offers are"} awaiting a patient&apos;s decision</p>
            </div>
            <span className="ml-auto hidden items-center gap-1 text-sm font-semibold text-primary-dark sm:flex">Track <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </motion.div>
      </div>

      {/* Performance */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold tracking-tight">Your performance</h2><p className="text-sm text-muted">Compared with the previous {days} days</p></div>
          <div role="group" aria-label="Date range" className="inline-flex rounded-xl border border-border bg-white p-1 text-sm font-medium shadow-sm">
            {RANGES.map((r) => (
              <button key={r.days} type="button" aria-pressed={days === r.days} onClick={() => setDays(r.days)} className={cn("relative cursor-pointer rounded-lg px-3.5 py-1.5 transition-colors", days === r.days ? "text-white" : "text-[var(--viz-ink-2)] hover:bg-mint")}>
                {days === r.days ? <motion.span layoutId="range-pill" className="absolute inset-0 rounded-lg bg-primary-dark" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                <span className="relative">Last {r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {empty ? (
          <div className="rounded-3xl border border-dashed border-border bg-white px-6 py-14 text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-mint text-primary-dark"><Inbox className="size-7" /></span>
            <p className="text-lg font-semibold">Your numbers will appear here</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">Once patients near your branches send requests, you&apos;ll see how many you receive, how fast you reply, your win rate and revenue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi i={0} icon={<Inbox className="size-5" />} color="var(--s1)" label="Requests received" value={cur.received} delta={pctDelta(cur.received, prev.received)} caption="from patients within 20 km" />
            <Kpi i={1} icon={<Send className="size-5" />} color="var(--s2)" label="Offers sent" value={cur.offered} delta={pctDelta(cur.offered, prev.offered)} caption={cur.responseRate === null ? "—" : `${Math.round(cur.responseRate * 100)}% of requests answered`} />
            <Kpi i={2} feature icon={<Trophy className="size-5" />} color="var(--s3)" label="Bookings won" value={cur.won} delta={pctDelta(cur.won, prev.won)} caption={cur.lost ? `${cur.lost} lost to other labs` : "No lost bids"} />
            <Kpi i={3} icon={<Wallet className="size-5" />} color="var(--s3)" label="Revenue won" value={cur.wonValue} format={formatCompactINR} delta={pctDelta(cur.wonValue, prev.wonValue)} caption={avgBooking ? `${formatINR(Math.round(avgBooking))} average booking` : "No bookings yet"} />
            <Kpi i={4} icon={<Percent className="size-5" />} color="#7c3aed" label="Win rate" value={cur.winRate === null ? undefined : Math.round(cur.winRate * 100)} format={(n) => `${n}%`} text="—" delta={cur.winRate !== null && prev.winRate !== null ? pctDelta(Math.round(cur.winRate * 100), Math.round(prev.winRate * 100)) : undefined} caption="of bids patients decided" />
            <Kpi i={5} icon={<Clock className="size-5" />} color="#0e6f7e" label="Average first reply" text={formatMinutes(cur.avgResponseMin)} delta={cur.avgResponseMin !== null && prev.avgResponseMin !== null ? pctDelta(cur.avgResponseMin, prev.avgResponseMin) : undefined} upIsGood={false} caption="from request to your first offer" />
          </div>
        )}
      </section>

      {/* Trends */}
      {!empty ? (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight"><BarChart3 className="size-5 text-primary-dark" /> Trends</h2>
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <motion.div {...reveal(2)} className="min-w-0"><Card className="h-full">
              <CardTitle icon={<TrendingUp className="size-4" />} title="Requests, offers & wins" hint="Hover (or use ← →) to read any day. Click a legend item to hide it." />
              <AreaChart data={daily} xKey="date" xFormat={fmtDay} ariaLabel={`Requests received, offers sent and bookings won per day over the last ${days} days`}
                series={[{ key: "received", label: "Received", color: "var(--s1)", area: true }, { key: "offered", label: "Offers sent", color: "var(--s2)" }, { key: "won", label: "Won", color: "var(--s3)" }]} />
            </Card></motion.div>
            <motion.div {...reveal(3)} className="min-w-0"><Card className="h-full">
              <CardTitle icon={<Percent className="size-4" />} title="Conversion funnel" hint="Where requests turn into bookings" />
              <FunnelChart stages={[{ label: "Requests received", value: cur.received }, { label: "Offers sent", value: cur.offered }, { label: "Bookings won", value: cur.won }]} />
              <p className="mt-4 text-xs text-[var(--viz-ink-3)]">Win rate counts only bids the patient has decided on.</p>
            </Card></motion.div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <motion.div {...reveal(4)} className="min-w-0 lg:col-span-2"><Card className="h-full">
              <CardTitle icon={<Trophy className="size-4" />} title="Revenue won" hint={days > 30 ? "Per week" : "Per day"} />
              <ColumnChart data={revenueBars} color="var(--s3)" yFormat={formatCompactINR} valueLabel="won" ariaLabel={`Revenue won over the last ${days} days`} />
            </Card></motion.div>
            <motion.div {...reveal(5)} className="min-w-0"><Card className="h-full">
              <CardTitle icon={<CheckCircle2 className="size-4" />} title="What happened to requests" hint={`Last ${days} days`} />
              <SegmentedBar ariaLabel="Outcome of requests" parts={[{ label: "Won", value: cur.won, color: "var(--s3)" }, { label: "Lost to another lab", value: cur.lost, color: "var(--s2)" }, { label: "No offer sent", value: noResponse, color: "#9aa8a1" }]} />
            </Card></motion.div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div {...reveal(6)} className="min-w-0"><Card className="h-full">
              <CardTitle icon={<TrendingUp className="size-4" />} title="Price vs the winner" hint="On bids you lost" />
              {gap ? (
                <HBarChart ariaLabel="Your average losing bid compared with the average winning price" format={formatINR} color="var(--s2)"
                  rows={[{ label: "Your average bid", value: gap.avgYourOffer, sub: `${gap.lostBids} lost bid${gap.lostBids === 1 ? "" : "s"}` }, { label: "Average winning price", value: gap.avgWinningPrice }]} />
              ) : <p className="rounded-xl bg-mint-soft p-4 text-sm text-[var(--viz-ink-2)]">No lost bids in this period — nothing to compare yet.</p>}
            </Card></motion.div>
            <motion.div {...reveal(7)} className="min-w-0"><Card className="h-full">
              <CardTitle icon={<MapPinned className="size-4" />} title="How far requests come from" hint="Distance to your nearest branch" />
              <ColumnChart data={bands.map((b) => ({ label: b.label, value: b.count }))} height={190} ariaLabel="Requests by distance band" valueLabel="requests" />
            </Card></motion.div>
          </div>
        </section>
      ) : null}

      {/* Insights */}
      {insights.length ? (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight"><Lightbulb className="size-5 text-primary-dark" /> Insights for you</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {insights.slice(0, 3).map((n, k) => (
              <motion.div key={n.title} {...reveal(k + 2)} className="rounded-3xl border border-border bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
                <span className={cn("mb-3 grid size-11 place-items-center rounded-2xl", n.tone === "good" ? "bg-mint text-primary-dark" : "bg-amber-50 text-[#8a5300]")}>{n.icon}</span>
                <p className="font-semibold">{n.title}</p>
                <p className="mt-1 text-sm text-muted">{n.text}</p>
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
