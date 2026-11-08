import { Header } from "@/components/site/header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (<><Header /><main className="flex-1">{children}</main></>);
}
