import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HabitDuo",
  description: "Duolingo-style habit tracker PWA",
  manifest: "/habit-duo/manifest.json",
  icons: { icon: "/habit-duo/icon-192.png", apple: "/habit-duo/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#6c5ce7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head><link rel="apple-touch-icon" href="/habit-duo/icon-192.png" /></head>
      <body>{children}</body>
    </html>
  );
}
