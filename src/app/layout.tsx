import type { Metadata, Viewport } from "next";
import { Bungee, Space_Grotesk, VT323 } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const pixel = VT323({ weight: "400", subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "DOPAMINE.EXE — the internet brainrot simulator",
  description: "A chaotic arcade of vertical memes, a needy virtual pet, a 2-minute roulette and absolutely zero real money.",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/favicon.svg` },
};

export const viewport: Viewport = {
  themeColor: "#07060b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${pixel.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
