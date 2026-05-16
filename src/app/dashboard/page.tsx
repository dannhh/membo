import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, concepts, progress } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, FileText, Plus, Clock } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const userConcepts = await db
    .select()
    .from(concepts)
    .where(eq(concepts.userId, userId))
    .orderBy(concepts.updatedAt);

  const userProgress = await db
    .select()
    .from(progress)
    .where(eq(progress.userId, userId));

  const progressMap = new Map(userProgress.map((p) => [p.conceptName, p]));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Concepts</h1>
          <Button asChild>
            <Link href="/learn">
              <Plus size={16} className="mr-1" /> New session
            </Link>
          </Button>
        </div>

        {userConcepts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-4 opacity-40" />
            <p className="font-medium">No concepts studied yet.</p>
            <p className="text-sm mt-1">Start a study session to begin building your knowledge base.</p>
            <Button asChild className="mt-6">
              <Link href="/learn">Start your first session</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userConcepts.map((concept) => {
              const prog = progressMap.get(concept.name);
              return (
                <Card key={concept.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <h2 className="font-semibold text-gray-900 truncate">{concept.name}</h2>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Clock size={11} />
                      Studied {concept.updatedAt.toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild className="flex-1 text-xs">
                        <Link href={`/learn?concept=${encodeURIComponent(concept.name)}&skill=study`}>
                          <BookOpen size={12} className="mr-1" /> Study
                        </Link>
                      </Button>
                      <Button
                        variant={prog ? "default" : "outline"}
                        size="sm"
                        asChild
                        className="flex-1 text-xs"
                      >
                        <Link href={`/learn?concept=${encodeURIComponent(concept.name)}&skill=quiz`}>
                          <Brain size={12} className="mr-1" /> Quiz
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="flex-1 text-xs">
                        <Link href={`/learn?concept=${encodeURIComponent(concept.name)}&skill=materials`}>
                          <FileText size={12} className="mr-1" /> Materials
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
