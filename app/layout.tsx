import type { Metadata } from "next";
import "./globals.css";
import "./landing.css";
import "./system.css";
export const viewport = { themeColor: "#000000" };
export const metadata: Metadata = {
  title: "Santo Corte | Barbearia e agendamentos",
  description:
    "Escolha seu serviço e horário na Santo Corte Barbearia, Canaã, Ipatinga.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Santo Corte",
  },
  icons: { icon: "/favicon.svg", apple: "/icons/apple-touch-icon.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
