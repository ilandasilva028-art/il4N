import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";

export const metadata: Metadata = { title: "Clip Factory Studio", description: "Production TikTok depuis Twitch et YouTube" };
export const viewport: Viewport = { themeColor: "#0B0F19", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
