import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prodej si sám",
  description:
    "SaaS, kde si kdokoli sám vytvoří prodejní prezentaci své nemovitosti.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
