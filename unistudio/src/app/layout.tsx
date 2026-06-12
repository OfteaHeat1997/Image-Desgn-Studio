import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Editorial display serif — used for brand wordmarks & headings to give the
// product a "fashion studio" feel instead of a generic dev dashboard.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "UniStudio — Fotografia de Producto con IA",
  description:
    "Estudio profesional de fotografia de producto con IA. Quita fondos, genera escenas, mejora imagenes y mas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} bg-surface text-white antialiased font-sans`}
      >
        <main className="min-h-screen">{children}</main>
        <ToastContainer />
      </body>
    </html>
  );
}
