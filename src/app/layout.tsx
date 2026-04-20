import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  title: "Checklist Turno",
  description: "Checklist premium de turno + pendências de retorno",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  // ✅ Agora o PWA entende modo claro e escuro na barra de status do celular
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f6" }, // Cinza bem claro
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" }   // O seu azul escuro
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
