import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Torah Quiz - Track Your Learning",
  description: "Track your Torah study progress and test your knowledge with personalized quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-screen">
      <body className={`${inter.className} min-h-screen bg-gray-900`}>
        {/* Global background layer that stays fixed */}
        <div className="bg-subtle-blue-gradient"></div>
        <main className="relative">{children}</main>
      </body>
    </html>
  );
}
