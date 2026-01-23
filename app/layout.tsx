import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { RecurlyProvider } from "@/components/RecurlyProvider";
import { Header } from "@/components/Header";

const quicksand = Quicksand({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "Coffee Subscription Demo",
  description: "Subscription demo site built with Next.js, Sanity.io, and Recurly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${quicksand.variable} font-sans antialiased`}
      >
        <Script
          src="https://js.recurly.com/v4/recurly.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://0af5a0a3-18d3-4997-ab6f-415981565466.redfastlabs.com/assets/redfast.js"
          strategy="afterInteractive"
        />
        <RecurlyProvider>
          <Header />
          {children}
        </RecurlyProvider>
      </body>
    </html>
  );
}
