import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      {/* Floating card */}
      <div className="flex-1 overflow-hidden px-3 sm:px-4 pt-3 pb-4">
        <div className="h-full rounded-3xl bg-white/72 backdrop-blur-sm border border-white/70 shadow-xl overflow-hidden">
          <Suspense fallback={null}>
            <FinanceDashboard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
