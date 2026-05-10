import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SeminarFlow - セミナー後の追客を自動化するSaaS",
    template: "%s | SeminarFlow",
  },
  description: "セミナー・ウェビナー開催者向けのアンケート収集・顧客管理・メルマガ配信を一元管理するSaaSプラットフォーム",
  keywords: ["セミナー", "アンケート", "顧客管理", "メルマガ", "CRM", "SaaS"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
