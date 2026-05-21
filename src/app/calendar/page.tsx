import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CalendarDashboard } from "@/components/calendar/CalendarDashboard";

export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <div className="fixed inset-0 flex flex-col">
      <Navbar />
      <div className="flex-1 min-h-0 overflow-hidden px-3 sm:px-4 pt-3 pb-4">
        <div className="h-full rounded-3xl bg-white/72 backdrop-blur-sm border border-white/70 shadow-xl overflow-hidden">
          <Suspense fallback={null}>
            <CalendarDashboard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
