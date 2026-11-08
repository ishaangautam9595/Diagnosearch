import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, Camera, Check, Handshake, Inbox, LineChart, MapPinned, MessagesSquare, ShieldCheck, Sparkles, Trash2, Trophy, WalletCards } from "lucide-react";
import { HeroVisual } from "@/components/site/hero-visual";
import { CountUp } from "@/components/site/count-up";
import { InView, InViewStagger, Stagger } from "@/components/site/motion";
import { getPublicStats } from "@/lib/services/public-stats";

const steps = [
  { icon: MapPinned, title: "Sign up & pin your address", text: "Create an account and drop a pin — we use it to find labs within 20 km of you." },
  { icon: Camera, title: "Upload a prescription or add tests", text: "Snap your prescription, or pick the tests you need. We compress the photo for you." },
  { icon: MessagesSquare, title: "Labs reply with their best price", text: "Every nearby lab sees your request and quotes you. Chat with any of them." },
  { icon: BadgeCheck, title: "Accept the best offer", text: "Choose one — the other offers and chats are deleted. Send your next request any time." },
];

const faqs = [
  { q: "How does it work?", a: "You send one request — a prescription photo and/or a list of tests. Every approved laboratory within 20 km of your address receives it and replies with its best total price. You compare, chat, and accept the one you like." },
  { q: "What happens to the other offers when I accept one?", a: "They are deleted, along with those laboratories' chats and their access to your prescription. Only the lab you accepted keeps the conversation going so you can arrange your visit." },
  { q: "Who can see my prescription and phone number?", a: "Only laboratories within 20 km see your request, and labs see just your first name and area. Your full name, contact details and exact address are shared only with the lab whose offer you accept." },
  { q: "Is it free?", a: "Yes, for patients. There is no payment on the platform — you pay the laboratory directly." },
  { q: "Are the prices final?", a: "Offers are made by the laboratories. Confirm the final price in the chat before your visit." },
  { q: "Does this replace my doctor?", a: "No. We don't give medical advice. Follow the preparation instructions from your doctor and laboratory." },
];

async function Stats() {
  const s = await getPublicStats();
  const items = [
    { v: s.labs, suffix: "", label: s.labs === 1 ? "partner lab" : "partner labs" },
    { v: s.tests, suffix: "", label: "tests in the catalogue" },
    { v: 20, suffix: " km", label: "request radius" },
    { v: s.cities, suffix: "", label: s.cities === 1 ? "city covered" : "cities covered" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="text-center">
          <dt className="sr-only">{i.label}</dt>
          <dd className="tabular text-3xl font-bold tracking-tight text-primary-dark sm:text-4xl"><CountUp value={i.v} suffix={i.suffix} /></dd>
          <p className="mt-1 text-sm text-muted">{i.label}</p>
        </div>
      ))}
    </dl>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-mint-soft via-white to-background">
        <div aria-hidden className="absolute inset-0 opacity-[0.5] [background-image:radial-gradient(#cfe9dc_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div aria-hidden className="ds-float-slow absolute -left-24 top-10 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr]">
          <Stagger className="space-y-6" gap={0.1}>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-primary-dark shadow-sm"><Sparkles className="size-3.5" /> Let nearby labs compete for your booking</p>
            <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Upload your prescription. Get{" "}
              <span className="bg-gradient-to-r from-primary-dark to-teal bg-clip-text text-transparent">the best price</span> from labs near you.
            </h1>
            <p className="max-w-xl text-lg text-muted">Send one request and laboratories within 20 km reply with their best offer. Chat, compare and accept — all in one place.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary-dark px-6 text-base font-semibold text-white shadow-lg shadow-primary-dark/25 transition-all hover:-translate-y-0.5 hover:brightness-95">Get started <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
              <Link href="/login" className="inline-flex h-12 items-center rounded-xl border border-border bg-white px-6 text-base font-semibold transition-colors hover:bg-mint">Sign in</Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {["Free for patients", "No payment on the platform", "Labs see only your first name"].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-primary" />{t}</li>)}
            </ul>
          </Stagger>
          <HeroVisual />
        </div>
      </section>

      {/* ───────── Stats ───────── */}
      <section className="mx-auto max-w-5xl px-4 pt-20">
        <InView><Suspense fallback={<div className="h-20" />}><Stats /></Suspense></InView>
      </section>

      {/* ───────── How it works ───────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20">
        <InView className="mb-10 max-w-xl"><p className="mb-2 text-sm font-semibold text-primary-dark">How it works</p><h2 className="text-3xl font-bold tracking-tight">From prescription to best price in four steps</h2></InView>
        <InViewStagger className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.12}>
          {steps.map((s, i) => (
            <div key={s.title} className="group relative h-full rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <span className="absolute right-4 top-4 text-5xl font-black text-mint transition-colors group-hover:text-primary/15">{i + 1}</span>
              <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-dark to-teal text-white shadow-md transition-transform group-hover:scale-110 group-hover:-rotate-3"><s.icon className="size-6" /></span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </InViewStagger>
      </section>

      {/* ───────── For patients ───────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-24 lg:grid-cols-2">
        <InView className="relative order-2 lg:order-1">
          <div className="relative mx-auto aspect-[4/4.6] max-w-md overflow-hidden rounded-[2rem] shadow-2xl shadow-primary-dark/15">
            <Image src="/images/nurse-patient.webp" alt="A nurse checking a patient's blood pressure" fill sizes="(min-width: 1024px) 440px, 90vw" className="object-cover" />
          </div>
        </InView>
        <InView className="order-1 lg:order-2" delay={0.1}>
          <p className="mb-2 text-sm font-semibold text-primary-dark">For patients</p>
          <h2 className="text-3xl font-bold tracking-tight">See real offers — and choose with confidence</h2>
          <p className="mt-3 text-muted">Instead of guessing which lab is cheapest, let them come to you. Compare prices side by side, ask questions in chat, and accept only when you&apos;re happy.</p>
          <ul className="mt-6 space-y-4">
            {[
              { icon: WalletCards, t: "Real offers for your exact tests", d: "Labs quote for what you actually need — no list-price guesswork." },
              { icon: ShieldCheck, t: "Your privacy, protected", d: "Labs see your first name and area. Full details go only to the lab you accept." },
              { icon: Trash2, t: "A clean slate every time", d: "Accept an offer and the rest — offers, chats, prescription access — are deleted." },
            ].map((f) => (
              <li key={f.t} className="flex gap-3"><span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-primary-dark"><f.icon className="size-5" /></span><div><p className="font-semibold">{f.t}</p><p className="text-sm text-muted">{f.d}</p></div></li>
            ))}
          </ul>
        </InView>
      </section>

      {/* ───────── For labs ───────── */}
      <section className="mt-24 bg-gradient-to-b from-[#f2fafb] to-background py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <InView>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#0e6f7e]"><Handshake className="size-4" /> For laboratories</p>
              <h2 className="text-3xl font-bold tracking-tight">Win bookings with your best price — and see how you&apos;re doing at a glance</h2>
              <p className="mt-3 text-muted">Patients within 20 km of your branches send you prescriptions and test lists. Reply with a price, chat, and track everything on your own dashboard.</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {["Requests come to you — no price lists to maintain", "Your numbers at a glance: requests, replies, win rate, revenue", "See how far each patient is, on a map", "Free to join · reviewed before you go live"].map((t) => <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[#0e6f7e]" />{t}</li>)}
              </ul>
              <Link href="/partner" className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-[#0e6f7e] px-6 text-base font-semibold text-white shadow-lg shadow-[#0e6f7e]/25 transition-all hover:-translate-y-0.5 hover:brightness-95">Become a lab partner <ArrowRight className="size-4" /></Link>
            </InView>
            <InView delay={0.1} className="relative">
              <div className="relative ml-auto aspect-[4/3] max-w-lg overflow-hidden rounded-[2rem] shadow-2xl">
                <Image src="/images/radiologist.webp" alt="A radiologist reviewing scans" fill sizes="(min-width: 1024px) 520px, 90vw" className="object-cover object-[50%_30%]" />
              </div>
            </InView>
          </div>
          <InViewStagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.1}>
            {[
              { icon: Inbox, t: "Requests, live", d: "See new patient requests the moment they arrive and reply with your best price." },
              { icon: LineChart, t: "Your numbers at a glance", d: "Cards and charts for requests, replies, win rate and revenue over 7, 30 or 90 days." },
              { icon: Trophy, t: "Know why you win or lose", d: "Compare your bids with the winning price, and see how fast you reply." },
              { icon: MapPinned, t: "See how far patients are", d: "Every request shows the patient's distance from your branch on a map." },
            ].map((f) => (
              <div key={f.t} className="h-full rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className="mb-3 grid size-11 place-items-center rounded-xl bg-[#e4f5f8] text-[#0e6f7e]"><f.icon className="size-5" /></span>
                <h3 className="font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted">{f.d}</p>
              </div>
            ))}
          </InViewStagger>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="mx-auto max-w-6xl px-4 pt-24">
        <InView>
          <div className="relative overflow-hidden rounded-[2rem] bg-primary-dark px-6 py-14 text-center text-white sm:px-12">
            <Image src="/images/stethoscope.webp" alt="" fill sizes="1100px" className="object-cover opacity-[0.14] mix-blend-luminosity" />
            <div aria-hidden className="ds-float-slow absolute -left-10 -top-16 size-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Your next test, at the best price near you.</h2>
              <p className="mt-3 text-white/85">Create a free account in a minute and send your first request.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-primary-dark transition-transform hover:-translate-y-0.5">Get started <ArrowRight className="size-4" /></Link>
                <Link href="/partner" className="inline-flex h-12 items-center rounded-xl border border-white/40 px-6 text-base font-semibold transition-colors hover:bg-white/10">I run a lab</Link>
              </div>
            </div>
          </div>
        </InView>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pt-24">
        <InView><h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2></InView>
        <InView className="mt-6" delay={0.05}>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group p-5 transition-colors open:bg-mint-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {f.q}
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-lg leading-none text-primary-dark transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </InView>
      </section>
    </>
  );
}
