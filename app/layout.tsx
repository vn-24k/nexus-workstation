import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VN TTS — Estúdio Vocal Autoral & Transmissão WhatsApp",
  description: "Estúdio vocal proprietário com clonagem de voz, análise acústica emocional, gravação e transmissão direta no WhatsApp.",
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
