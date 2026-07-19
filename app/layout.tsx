import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2028 国考备考助手",
  description: "每天有计划地学习，及时复习真正薄弱的内容。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
