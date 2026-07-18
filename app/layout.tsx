import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://what-ui-guide.reasonw6.chatgpt.site"),
  title: {
    default: "这叫啥 UI？",
    template: "%s｜这叫啥 UI？",
  },
  description:
    "从截图或公开网页识别 UI/UX 组件，并获得证据、易混区别、实现指导与代码。",
  applicationName: "这叫啥 UI？",
  keywords: ["UI", "UX", "组件", "交互设计", "前端", "视觉词典"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "这叫啥 UI？",
    title: "这叫啥 UI？",
    description: "从截图或网页识别 UI/UX 组件，再理解区别并直接实现。",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "这叫啥 UI？AI 视觉词典",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "这叫啥 UI？",
    description: "从截图或网页识别 UI/UX 组件，再理解区别并直接实现。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
