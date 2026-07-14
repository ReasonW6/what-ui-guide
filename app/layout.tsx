import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "这叫啥 UI？",
    template: "%s｜这叫啥 UI？",
  },
  description:
    "面向非专业设计师与开发者的中英双语 UI/UX 交互式视觉词典。",
  applicationName: "这叫啥 UI？",
  keywords: ["UI", "UX", "组件", "交互设计", "前端", "视觉词典"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "这叫啥 UI？",
    title: "这叫啥 UI？",
    description: "亲手试一试，再记住它的标准名称。",
  },
  twitter: {
    card: "summary",
    title: "这叫啥 UI？",
    description: "亲手试一试，再记住它的标准名称。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
