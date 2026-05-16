"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { BookOpen } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white px-4 h-14 flex items-center gap-4">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
        <BookOpen size={20} className="text-indigo-600" />
        Memory Board
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <Link href="/learn" className="text-sm text-gray-600 hover:text-gray-900">
          + New session
        </Link>
        <UserButton />
      </div>
    </nav>
  );
}
