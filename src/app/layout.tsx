import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Concept Learner",
  description: "Master any concept with guided study, spaced repetition quizzes, and AI-generated study materials.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
        <body className="h-full bg-gray-50 font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
