import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { TEMA_SCRIPT } from "@/components/theme/tema-script";

import "./globals.css";

export const metadata: Metadata = {
  title: "Acesso ao Portal | GGP",
  description: "Acesso seguro ao portal interno do Grupo Gomes Pires.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1215" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // O script do <head> põe `.dark` antes da hidratação: a classe diverge de
    // propósito do HTML do servidor.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
        <link rel="preload" href="/fonts/Inter-var-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
