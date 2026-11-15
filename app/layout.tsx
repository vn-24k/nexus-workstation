import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus Workstation — Central Operacional de Dados & Bot",
  description: "Plataforma profissional de processamento de dados, orquestração de bot, APIs e sincronização em nuvem.",
  authors: [{ name: "vn-24k" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#07080c] text-zinc-100 antialiased selection:bg-amber-500/30">
        {children}
      </body>
    </html>
  );
}
