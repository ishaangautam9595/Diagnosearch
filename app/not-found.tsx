import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Home, Search } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = {
  title: "Page not found",
  description: "We couldn't find the page you were looking for.",
  robots: { index: false, follow: true },
};

/** Shown for any unknown URL and whenever a page calls notFound() (e.g. a lab that doesn't exist). */
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center bg-gradient-to-b from-mint-soft via-white to-background">
        <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
          <p className="bg-gradient-to-r from-primary-dark to-teal bg-clip-text text-8xl font-black tracking-tight text-transparent sm:text-9xl">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">We couldn&apos;t find that page</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            The link may be broken, or the page may have moved. Head back home to compare diagnostic test prices from labs near you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary-dark px-6 text-base font-semibold text-white shadow-lg shadow-primary-dark/25 transition-all hover:-translate-y-0.5 hover:brightness-95">
              <Home className="size-4" /> Back to home
            </Link>
            <Link href="/signup" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-white px-6 text-base font-semibold transition-colors hover:bg-mint">
              <Search className="size-4" /> Find a test price
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted">
            Run a laboratory?{" "}
            <Link href="/partner" className="inline-flex items-center gap-1 font-semibold text-primary-dark underline">Become a lab partner <ArrowRight className="size-3.5" /></Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
