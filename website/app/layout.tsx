import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConditionalAIButton from "@/components/ConditionalAIButton";
import { LangProvider } from "@/contexts/LangContext";
import { AuthProvider } from "@/contexts/AuthContext";
import JsonLd from "@/components/JsonLd";

// Sitewide structured data — Organization + WebSite (knowledge graph + GEO/AI engines).
const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://cardwiz.in/#org",
      name: "CardWiz",
      url: "https://cardwiz.in",
      logo: "https://cardwiz.in/opengraph-image",
      description:
        "CardWiz helps Indians pick the credit or debit card that gives the most rewards at checkout — compare 195+ Indian cards, understand bank offers, and never overpay.",
      areaServed: "IN",
      knowsAbout: [
        "credit cards",
        "debit cards",
        "cashback",
        "reward points",
        "credit card offers",
        "Indian banks",
        "UPI",
        "RuPay",
        "card comparison",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://cardwiz.in/#website",
      url: "https://cardwiz.in",
      name: "CardWiz",
      inLanguage: "en-IN",
      publisher: { "@id": "https://cardwiz.in/#org" },
    },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display font for headings (h1/h2). Body stays Geist.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cardwiz.in"),
  title: {
    default: "CardWiz — India ka smart credit & debit card reward finder",
    template: "%s · CardWiz",
  },
  description:
    "Checkout pe sabse zyada bachat dene wala credit/debit card batao. 195+ Indian cards compare karo, bank offers samjho, bill reminders pao. Privacy-first, free Chrome extension.",
  keywords: [
    "best credit card india",
    "credit card rewards",
    "cashback cards india",
    "card comparison",
    "amazon best card",
    "CardWiz",
  ],
  openGraph: {
    title: "CardWiz — India ka smart card reward finder",
    description:
      "195+ Indian credit & debit cards compare karo. Checkout pe best card batao. Free.",
    url: "https://cardwiz.in",
    siteName: "CardWiz",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CardWiz — India ka smart card reward finder",
    description:
      "195+ Indian credit & debit cards compare karo. Checkout pe best card batao. Free.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

// Address-bar / PWA chrome color — matches the dark site background.
export const viewport: Viewport = {
  themeColor: "#0C1018",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1554196751103834"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Sitewide structured data — in <body> so AdSense's head-script injection
            can't shift it and break hydration. JSON-LD is valid anywhere in the doc. */}
        <JsonLd data={SITE_LD} />
        <LangProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <ConditionalAIButton />
          </AuthProvider>
        </LangProvider>
        <Analytics />
      </body>
    </html>
  );
}
