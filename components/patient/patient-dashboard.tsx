"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock, FilePlus2, Layers, MapPin, PiggyBank, Radar, Sparkles, Store, TrendingDown } from "lucide-react";
import { ColumnChart, HBarChart } from "@/components/charts/bars";
import { StatTile } from "@/components/charts/stat-tile";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { OverviewMap } from "@/components/map/overview-map-lazy";
import { ApiStatus, DashboardSkeleton, LoadError } from "@/components/dashboard/api-status";
import { useApi } from "@/lib/client/use-api";
import { Card } from "@/components/ui/card";
import { formatCompactINR, formatINR } from "@/lib/money";
import { formatMinutes } from "@/lib/analytics";

export interface PatientInsightsData {
  totalRequests: number; accepted: number; open: number; totalSaved: number; avgOffersPerRequest: number | null; avgFirstOfferMin: number | null;
  savings: { reference: string; label: string; saved: number; paid: number; offers: number }[];
  weeks: { label: string; count: number }[];
  nearbyLabs: { id: string; name: string; distanceKm: number; lat: number; lng: number; verified: boolean; home: boolean }[];
}

const reveal = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.1 + i * 0.07 } });

function CardTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 font-semibold text-[var(--viz-ink)]"><span className="text-primary-dark">{icon}</span>{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-[var(--viz-ink-3)]">{hint}</p> : null}
    </div>
  );
}

interface PatientPayload {
  generatedAt: string;
  home: { lat: number; lng: number } | null;
  insights: PatientInsightsData;
  offersWaiting: number;
  live: { id: string; reference: string; offers: { lab: string; price: number }[] } | null;
}

/** Fetches /api/patient/insights (refreshing every 30 s and when the tab regains focus) and renders the dashboard. */
export function PatientDashboard({ name }: { name: string }) {
  const api = useApi<PatientPayload>("/api/patient/insights");
  if (api.loading) return <DashboardSkeleton />;
  if (!api.data) return <LoadError message={api.error ?? "Couldn't load your dashboard."} onRetry={api.reload} />;
  return (
    <>
      <ApiStatus api={api} className="mb-3 justify-end" />
      <PatientView name={name} {...api.data} />
    </>
  );
}

function PatientView({ name, insights, home, live, offersWaiting }: { name: string } & Omit<PatientPayload, "generatedAt">) {
  const i = insights;
  const lowest = live && live.offers.length ? Math.min(...live.offers.map((o) => o.price)) : null;
  const highest = live && live.offers.length ? Math.max(...live.offers.map((o) => o.price)) : null;
  return (
    <div className="viz space-y-6">
      {/* Hero */}
      <motion.div {...reveal(0)} className="min-w-0 ds-gradient-anim relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-dark via-[#0b8f60] to-teal p-6 text-white sm:p-8">
        <div aria-hidden className="ds-float-slow absolute -right-12 -top-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="ds-float absolute -bottom-24 left-1/3 size-60 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm text-white/80">Hello,</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name} <motion.span className="inline-block origin-[70%_70%]" animate={{ rotate: [0, 18, -8, 14, 0] }} transition={{ duration: 1.6, delay: 0.6 }}>👋</motion.span></h1>
            <p className="mt-2 text-white/90">
              {offersWaiting > 0 ? <>You have <strong>{offersWaiting} offer{offersWaiting === 1 ? "" : "s"}</strong> waiting. Compare and chat to pick the best one.</>
                : <>Upload a prescription or list your tests — {i.nearbyLabs.length > 0 ? `${i.nearbyLabs.length} lab${i.nearbyLabs.length === 1 ? "" : "s"} near you` : "labs near you"} will send their best price.</>}
            </p>
            <Link href="/app/requests/new" className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-base font-semibold text-primary-dark shadow-sm transition-transform hover:-translate-y-0.5"><FilePlus2 className="size-4" /> New request</Link>
          </div>
          {i.totalSaved > 0 ? (
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/85"><PiggyBank className="size-4" /> You&apos;ve saved</p>
              <p className="tabular text-4xl font-bold"><AnimatedNumber value={i.totalSaved} format={(n) => formatINR(Math.round(n))} duration={1.4} /></p>
              <p className="text-xs text-white/80">vs the highest offer, over {i.savings.length} booking{i.savings.length === 1 ? "" : "s"}</p>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} icon={<Layers className="size-3.5" />} label="Requests sent" value={i.totalRequests} spark={i.weeks.map((w) => w.count)} sparkColor="var(--s1)" hint={`${i.open} open · ${i.accepted} done`} />
        <StatTile index={1} icon={<Sparkles className="size-3.5" />} label="Offers per request" value={i.avgOffersPerRequest ?? undefined} text="—" format={(n) => n.toFixed(1)} hint="on average" />
        <StatTile index={2} icon={<Clock className="size-3.5" />} label="Time to first offer" text={formatMinutes(i.avgFirstOfferMin)} hint="on average" />
        <StatTile index={3} icon={<PiggyBank className="size-3.5" />} label="Total saved" value={i.totalSaved} format={formatCompactINR} hint="vs the highest offer" highlight={i.totalSaved > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Live comparison */}
        <motion.div {...reveal(2)} className="min-w-0"><Card className="flex h-full flex-col">
          <CardTitle icon={<TrendingDown className="size-4" />} title="Live offer comparison" hint={live ? `${live.reference} — updates as labs reply` : undefined} />
          {live && live.offers.length > 0 ? (
            <>
              <HBarChart ariaLabel="Offer prices compared" format={formatINR}
                rows={[...live.offers].sort((a, b) => a.price - b.price).map((o) => ({ label: o.lab, value: o.price, highlight: live.offers.length > 1 && o.price === lowest }))} />
              {lowest !== null && highest !== null && highest > lowest ? <p className="mt-4 rounded-xl bg-mint p-3 text-sm font-medium text-primary-dark">Choosing the lowest offer saves you {formatINR(highest - lowest)} ({Math.round(((highest - lowest) / highest) * 100)}%).</p> : null}
              <Link href={`/app/requests/${live.id}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary-dark hover:underline">Open &amp; chat <ArrowRight className="size-4" /></Link>
            </>
          ) : (
            <div className="grid place-items-center py-8 text-center">
              <div className="relative mb-4 grid size-16 place-items-center rounded-full bg-mint text-primary-dark"><span className="ds-ring absolute inset-0 rounded-full bg-primary/30" /><Radar className="relative size-7" /></div>
              <p className="font-semibold">{i.open > 0 ? "Waiting for labs to reply" : "No open request"}</p>
              <p className="mt-1 max-w-xs text-sm text-muted">{i.open > 0 ? "Offers will show up here the moment labs respond." : "Send a request and watch labs compete on price."}</p>
            </div>
          )}
        </Card></motion.div>

        {/* Nearby labs map */}
        <motion.div {...reveal(3)} className="min-w-0"><Card className="h-full">
          <CardTitle icon={<MapPin className="size-4" />} title="Labs within 20 km" hint={i.nearbyLabs.length ? `${i.nearbyLabs.length} lab${i.nearbyLabs.length === 1 ? "" : "s"} will receive your next request` : "No labs near your address yet"} />
          {home ? (
            <OverviewMap center={home} radiusKm={20} height={260}
              markers={[{ lat: home.lat, lng: home.lng, label: "Your address", kind: "home" }, ...i.nearbyLabs.map((l) => ({ lat: l.lat, lng: l.lng, label: l.name, sub: `${l.distanceKm} km away${l.verified ? " · verified" : ""}`, kind: "lab" as const }))]} />
          ) : <p className="rounded-xl bg-mint-soft p-4 text-sm text-muted">Add your address in Profile to see labs near you.</p>}
          {i.nearbyLabs.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {i.nearbyLabs.slice(0, 6).map((l) => <li key={l.id} className="flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 font-medium text-primary-dark"><Store className="size-3" />{l.name} · {l.distanceKm} km</li>)}
            </ul>
          ) : null}
        </Card></motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div {...reveal(4)} className="min-w-0"><Card className="h-full">
          <CardTitle icon={<PiggyBank className="size-4" />} title="Savings by booking" hint="How much less you paid than the highest offer" />
          {i.savings.length ? (
            <ColumnChart color="var(--s3)" yFormat={formatCompactINR} valueLabel="saved" ariaLabel="Savings per accepted booking"
              data={i.savings.map((s) => ({ label: s.label, value: s.saved, sub: `${s.reference} · paid ${formatINR(s.paid)} · ${s.offers} offers` }))} />
          ) : <p className="rounded-xl bg-mint-soft p-4 text-sm text-muted">Accept an offer and your savings will be charted here.</p>}
        </Card></motion.div>
        <motion.div {...reveal(5)} className="min-w-0"><Card className="h-full">
          <CardTitle icon={<Layers className="size-4" />} title="Your requests, week by week" hint="Last 8 weeks" />
          <ColumnChart data={i.weeks.map((w) => ({ label: w.label, value: w.count }))} valueLabel="requests" ariaLabel="Requests sent per week" />
        </Card></motion.div>
      </div>
    </div>
  );
}
