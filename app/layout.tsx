import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { RecurlyProvider } from "@/components/RecurlyProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";

const urbanist = Urbanist({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-urbanist",
});

// Example: Loading a custom font file (.otf, .ttf, .woff, etc.)
// Place your font file in: fonts/YourFontName-Regular.otf
// Uncomment and modify the path below:

const customFont = localFont({
  src: [
    {
      path: "../public/fonts/sailers.otf",
      weight: "400",
      style: "normal",
    },


  ],
  variable: "--font-sailers",
  display: "swap", // Optional: improves loading performance
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
        className={`${urbanist.variable} ${customFont.variable} font-sans antialiased`}
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
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <Header />
                {children}
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </RecurlyProvider>
      </body>
    </html>
  );
}
