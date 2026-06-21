import { Navbar } from "@/components/Navbar";
import { SessionProvider } from "@/components/SessionProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Navbar />
      <SessionProvider>{children}</SessionProvider>
    </div>
  );
}
