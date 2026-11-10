import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TSG-TNT — Hệ thống quản lý vận hành",
  description:
    "Hệ thống quản lý vận hành nhà máy bê tông TSG-TNT: báo cáo sản xuất, tài xế, phương tiện, giấy tờ và AI camera giám sát.",
  applicationName: "TSG-TNT",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b2d5c" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
