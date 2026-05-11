import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 每日复盘工具",
  description: "支持文字与语音转文字输入的个人 AI 复盘工具。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
