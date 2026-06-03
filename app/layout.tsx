import type { Metadata } from "next";
import "./globals.css";
import Web3Providers from "./Web3Providers";
import WasmProvider from "@/components/WasmProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TransactionToastProvider } from "@/components/TransactionToastProvider";

export const metadata: Metadata = {
  title: "Track Rails",
  description:
    "Audio tracks on Story Protocol's Confidential Data Rails — upload, license, and stream encrypted audio.",
  other: {
    "link:preconnect": [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Web3Providers>
          <TransactionToastProvider>
            <WasmProvider>
              <Navbar />
              <main className="flex-1 pt-16">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              <Footer />
            </WasmProvider>
          </TransactionToastProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
