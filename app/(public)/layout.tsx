import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
