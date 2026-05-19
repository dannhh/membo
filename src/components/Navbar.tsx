"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { BookOpen, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const FINANCE_TABS = [
  { key: "overview",      label: "Overview"      },
  { key: "accounts",      label: "Accounts"      },
  { key: "transactions",  label: "Transactions"  },
] as const;

export function Navbar() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const isLearn   = pathname === "/dashboard" || pathname?.startsWith("/learn");
  const isFinance = pathname?.startsWith("/finance");
  const currentTab = searchParams.get("tab") || "overview";

  return (
    <div className="flex items-center justify-center px-4 pt-3 pb-0 h-14 shrink-0">
      <nav className="flex items-center gap-0.5 bg-white/85 backdrop-blur-md rounded-full px-2 py-1.5 shadow-sm border border-white/60 overflow-x-auto no-scrollbar">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-gray-700 hover:bg-white/60 transition-colors shrink-0"
        >
          <BookOpen size={13} className="text-violet-500" />
          Memory
        </Link>

        <div className="w-px h-3.5 bg-gray-200/80 mx-1 shrink-0" />

        {/* Learn */}
        <Link
          href="/dashboard"
          className={cn(
            "shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap",
            isLearn
              ? "bg-white shadow-sm text-gray-800"
              : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
          )}
        >
          Learn
        </Link>

        {/* Finance */}
        <Link
          href="/finance"
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap",
            isFinance
              ? "bg-white shadow-sm text-gray-800"
              : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
          )}
        >
          <Wallet size={12} />
          Finance
        </Link>

        {/* Finance sub-tabs — shown only on /finance */}
        {isFinance && (
          <>
            <div className="w-px h-3.5 bg-gray-200/80 mx-1 shrink-0" />
            {FINANCE_TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={`/finance?tab=${key}`}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  currentTab === key
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                )}
              >
                {label}
              </Link>
            ))}
          </>
        )}

        <div className="w-px h-3.5 bg-gray-200/80 mx-1.5 shrink-0" />

        <div className="pr-1 shrink-0">
          <UserButton />
        </div>
      </nav>
    </div>
  );
}
