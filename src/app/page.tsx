import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BookOpen, Brain, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white px-6 h-14 flex items-center">
        <div className="flex items-center gap-2 font-bold text-gray-900">
          <BookOpen size={20} className="text-indigo-600" />
          Concept Learner
        </div>
        <div className="ml-auto flex gap-3">
          {isSignedIn ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/sign-up">Get started free</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Master any concept.{" "}
            <span className="text-indigo-600">Actually retain it.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 leading-relaxed">
            An AI tutor that breaks down complex topics progressively, quizzes you with
            spaced repetition, and remembers exactly where you left off — across every session.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href={isSignedIn ? "/learn" : "/sign-up"}>
                Start learning <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {[
            {
              icon: <BookOpen size={24} className="text-indigo-600" />,
              title: "Guided Study",
              description:
                "Progressive deep-dives that start with intuition and build to nuance. Adapts to your background.",
            },
            {
              icon: <Brain size={24} className="text-indigo-600" />,
              title: "Spaced Repetition",
              description:
                "Questions weighted toward your weak spots. Scores and tracks retention over time.",
            },
            {
              icon: <FileText size={24} className="text-indigo-600" />,
              title: "Study Materials",
              description:
                "Generate flashcards, summaries, or cheat sheets from anything you've studied.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-gray-200 p-6 text-left shadow-sm"
            >
              <div className="mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        Built with Claude API · Powered by Anthropic
      </footer>
    </div>
  );
}
