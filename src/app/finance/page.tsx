import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";

export default async function FinancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <FinanceDashboard />
      </div>
    </div>
  );
}
