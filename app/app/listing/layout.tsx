import { Playfair_Display, Work_Sans } from "next/font/google";

// Veřejná prezentace má vlastní SVĚTLOU vizuální identitu (podle referenční
// Otínské): serifové nadpisy Playfair Display + čistý Work Sans na text.
// Fonty balí next/font při buildu — za běhu se nic nestahuje z internetu.
// Zbytek aplikace (průvodce, účet) zůstává v tmavém stylu.

const displayFont = Playfair_Display({
  subsets: ["latin", "latin-ext"], // latin-ext kvůli češtině (ěščřž…)
  variable: "--font-display",
});

const bodyFont = Work_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable}`}
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#1c1917",
        fontFamily: "var(--font-body), -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {children}
    </div>
  );
}
