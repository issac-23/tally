import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Work Sans handles body, buttons, data points, labels, microcopy.
// One font, multiple weights and sizes for the different roles.
const workSans = localFont({
  variable: "--font-work-sans",
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    {
      path: "../node_modules/@fontsource/work-sans/files/work-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/work-sans/files/work-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/work-sans/files/work-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/work-sans/files/work-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

// Playfair Display only on H1 / display headings via .font-display.
const playfair = localFont({
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  src: [
    {
      path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  title: "Tally — Personal Finance Tracker",
  description:
    "Track your spending, understand your runway, and take control of your finances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${workSans.variable} ${playfair.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
        {children}
      </body>
    </html>
  );
}
