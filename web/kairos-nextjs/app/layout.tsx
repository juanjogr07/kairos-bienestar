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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-deep text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
