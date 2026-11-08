import { Suspense } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession, roleHome } from "@/lib/auth";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary-dark text-white"><FlaskConical className="size-4.5" /></span>
      <span className="text-lg">Diagno<span className="text-primary-dark">Search</span></span>
    </Link>
  );
}

function SignedOutLinks() {
  return (
    <>
      <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-mint">Sign in</Link>
      <Button asChild size="sm" className="ml-1"><Link href="/signup">Get started</Link></Button>
    </>
  );
}

async function SessionLinks() {
  const s = await getSession();
  if (!s) return <SignedOutLinks />;
  return <Button asChild size="sm" className="ml-1"><Link href={roleHome(s.role)}>My dashboard</Link></Button>;
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <Link href="/#how-it-works" className="hidden rounded-lg px-3 py-2 hover:bg-mint sm:block">How it works</Link>
          <Link href="/partner" className="hidden rounded-lg px-3 py-2 hover:bg-mint md:block">Become a lab partner</Link>
          <Suspense fallback={<SignedOutLinks />}><SessionLinks /></Suspense>
        </nav>
      </div>
    </header>
  );
}
