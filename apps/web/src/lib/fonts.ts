import { Inter, JetBrains_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";

/** Body & UI copy — exceptional legibility in dense tables. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Numeric data (quantities, prices, lot ids) — character distinction. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

/** Headlines & display — sharp, technical edge. */
export const geist = GeistSans;

/** Combined font CSS variables for the <html> element. */
export const fontVariables = `${inter.variable} ${jetbrainsMono.variable} ${geist.variable}`;
