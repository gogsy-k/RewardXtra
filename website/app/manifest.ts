import type { MetadataRoute } from "next";

// PWA / install manifest. Colors match the site's indigo design system
// (accent #6366F1 on the dark #0C1018 background). Icons live in /public.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CardWiz — India ka smart card reward finder",
    short_name: "CardWiz",
    description:
      "Checkout pe sabse zyada bachat dene wala credit/debit card batao. 195+ Indian cards compare karo. Privacy-first.",
    start_url: "/",
    display: "standalone",
    background_color: "#0C1018",
    theme_color: "#6366F1",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
