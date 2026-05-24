import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kairós — Tu copiloto de bienestar digital",
  description:
    "Kairós es tu copiloto de bienestar digital. Un agente que te acompaña con datos vivos para mejorar tu relación con la pantalla.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
