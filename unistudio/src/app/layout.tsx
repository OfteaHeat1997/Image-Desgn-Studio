import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniStudio - AI Product Photography",
  description:
    "Professional AI-powered product photography studio. Remove backgrounds, generate scenes, enhance images, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} bg-surface text-white antialiased font-sans`}
      >
        <main className="min-h-screen">{children}</main>
        <ToastContainer />
      </body>
    </html>
  );
}
