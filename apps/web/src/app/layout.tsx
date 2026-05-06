import type { Metadata } from "next";

import "./globals.css";

const themeBootstrap = `
(function(){
  try {
    var stored = localStorage.getItem('lingora_data_theme');
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-theme', 'sakura');
  } catch(e) {}
})();`;

export const metadata: Metadata = {
  title: "Lingora Next — Belajar bahasa",
  description:
    "Platform belajar Jepang, Mandarin, Korea — Next.js 14 · Prisma Postgres · Better Auth (Fase A shell).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning data-color-theme="sakura">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
