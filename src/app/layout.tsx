import type { Metadata } from "next";
import type { Viewport } from "next";
import Link from "next/link";
import { Archive, Camera, Sparkles } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "懒得记 lazylog",
  description: "人可以懒，回忆不能散。"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="paper-shell">
          <header className="paper-band sticky top-0 z-30">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
              <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-[0.08em]">
                <Sparkles size={22} color="#e46d9c" />
                懒得记
              </Link>
              <nav className="flex items-center gap-2 text-sm">
                <Link className="icon-button secondary px-3 py-2" href="/" title="上传记录">
                  <Camera size={17} />
                  <span className="hidden sm:inline">记录</span>
                </Link>
                <Link className="icon-button secondary px-3 py-2" href="/records" title="生活档案">
                  <Archive size={17} />
                  <span className="hidden sm:inline">档案</span>
                </Link>
                <Link className="icon-button px-3 py-2" href="/report" title="生成报告">
                  <Sparkles size={17} />
                  <span className="hidden sm:inline">报告</span>
                </Link>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
