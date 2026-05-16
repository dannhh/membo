import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ChatInterface } from "@/components/ChatInterface";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ noteType?: string; title?: string; mode?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { noteType, title, mode } = await searchParams;

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          initialNoteType={noteType}
          initialTitle={title}
          initialMode={mode}
        />
      </div>
    </div>
  );
}
