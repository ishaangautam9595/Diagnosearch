import Link from "next/link";
import { Logo } from "./header";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">
            Upload a prescription or list your tests and let nearby laboratories compete for your booking. We connect you with labs — we are not a medical provider.
          </p>
        </div>
        <nav aria-label="Explore" className="text-sm">
          <h2 className="mb-3 font-semibold">Explore</h2>
          <ul className="space-y-2 text-muted">
            <li><Link className="hover:text-foreground" href="/signup">Create an account</Link></li>
            <li><Link className="hover:text-foreground" href="/login">Sign in</Link></li>
            <li><Link className="hover:text-foreground" href="/partner">Become a lab partner</Link></li>
            <li><Link className="hover:text-foreground" href="/#faq">FAQs</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <h2 className="mb-3 font-semibold">Good to know</h2>
          <p className="text-muted">Offers are made by laboratories and may change. Confirm the final price with the lab before your visit, and always follow your doctor&apos;s advice.</p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">© DiagnoSearch</div>
    </footer>
  );
}
