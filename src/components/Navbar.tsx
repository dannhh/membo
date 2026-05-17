"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { BookOpen, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-gray-200 bg-white px-4 h-14 flex items-center gap-4">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
        <BookOpen size={20} className="text-indigo-600" />
        Memory Board
      </Link>

      <div className="flex items-center gap-1 ml-4">
        <Link
          href="/dashboard"
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/dashboard" || pathname === "/learn"
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          Learn
        </Link>
        <Link
          href="/finance"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            pathname?.startsWith("/finance")
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Wallet size={14} />
          Finance
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {!pathname?.startsWith("/finance") && (
          <Link href="/learn" className="text-sm text-gray-600 hover:text-gray-900">
            + New session
          </Link>
        )}
        <UserButton />
      </div>
    </nav>
  );
}
