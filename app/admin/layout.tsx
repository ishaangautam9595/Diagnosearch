import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · DiagnoSearch Admin" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
