import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Memory Board",
  description: "Master any concept with guided study, spaced repetition quizzes, and AI-generated study materials.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className="h-full bg-gray-50 font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
