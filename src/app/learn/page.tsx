import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ChatInterface } from "@/components/ChatInterface";

interface SearchParams {
  concept?: string;
  skill?: string;
}

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { concept } = await searchParams;

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <ChatInterface initialConcept={concept} />
      </div>
    </div>
  );
}
