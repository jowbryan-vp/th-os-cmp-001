import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadastro Mestre do Projeto | TH OS",
  description:
    "Cadastro Mestre do Projeto da TH Arquitetura — fonte central de informações do TH OS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
