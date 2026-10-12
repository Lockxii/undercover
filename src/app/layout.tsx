import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import ServiceWorker from '@/components/ServiceWorker';

const nunito = Nunito({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#58CC02",
};

export const metadata: Metadata = {
  title: "Undercover Pro",
  description: "Démasquez l'imposteur parmi vous !",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={nunito.className}>{children}<ServiceWorker /></body>
    </html>
  );
}
