import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Torah Quizician - Track Your Learning",
  description: "Track your Torah study progress and test your knowledge with personalized quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-screen">
      <body className={`${inter.className} ${inter.variable} min-h-screen bg-gray-900 font-sans`}>
        {/* Global background layer with enhanced effects */}
        <div className="bg-subtle-blue-gradient">
          {/* Animated gradient orbs */}
          <div className="fixed top-[10%] left-[15%] w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-float opacity-30"></div>
          <div className="fixed top-[60%] right-[10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-float-delayed opacity-30"></div>
          {/* Grid pattern overlay */}
          <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.15]"></div>
        </div>
        
        <main className="relative">{children}</main>
      </body>
    </html>
  );
}
