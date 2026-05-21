import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BookOpen, Wallet, GraduationCap, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="px-6 h-14 flex items-center shrink-0">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <BookOpen size={16} className="text-violet-500" />
          Memory
        </div>
        <div className="ml-auto flex gap-2">
          {isSignedIn ? (
            <Button size="sm" asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href="/dashboard">Open app</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="bg-violet-600 hover:bg-violet-700">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Learn smarter.{" "}
            <span className="text-violet-600">Live better.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-500 leading-relaxed">
            Your personal assistant for learning, finances, and wellness —
            all in one place.
          </p>
          <div className="mt-8 flex gap-3 justify-center flex-wrap">
            <Button size="lg" asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href={isSignedIn ? "/dashboard" : "/sign-up"}>
                Get started free <ArrowRight size={15} className="ml-1.5" />
              </Link>
            </Button>
            {isSignedIn && (
              <Button size="lg" variant="outline" asChild>
                <Link href="/finance">View finances</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            {
              icon: <GraduationCap size={20} className="text-violet-500" />,
              title: "Learn",
              description:
                "AI study sessions, spaced repetition, and smart notes to help you actually retain what you learn.",
              href: isSignedIn ? "/dashboard" : "/sign-up",
              accent: "border-violet-100",
            },
            {
              icon: <Wallet size={20} className="text-emerald-500" />,
              title: "Finance",
              description:
                "Track spending, set budgets, and get an AI assistant to make sense of your money.",
              href: isSignedIn ? "/finance" : "/sign-up",
              accent: "border-emerald-100",
            },
            {
              icon: <CalendarDays size={20} className="text-blue-400" />,
              title: "Calendar",
              description:
                "Plan events, tasks, and study sessions in one view. Stay on top of what matters.",
              href: isSignedIn ? "/calendar" : "/sign-up",
              accent: "border-blue-100",
            },
          ].map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl border ${f.accent} p-6 text-left shadow-sm hover:shadow-md transition-shadow group`}
            >
              <div className="mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-violet-600 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Memory
      </footer>
    </div>
  );
}
