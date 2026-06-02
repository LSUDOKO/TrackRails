import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Web3Providers from "./Web3Providers";
import WasmProvider from "@/components/WasmProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Track Rails",
  description:
    "Audio tracks on Story Protocol's Confidential Data Rails — upload, license, and stream encrypted audio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Web3Providers>
          <WasmProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </WasmProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
