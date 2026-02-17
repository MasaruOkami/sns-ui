import type { Metadata } from "next";
import "./globals.css"; // 基本的なデザイン設定を読み込み

export const metadata: Metadata = {
  title: "SNS Post Manager",
  description: "SNS投稿のAI生成・管理ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50 text-gray-900">
        {/* ここに各ページ（login, dashboardなど）が表示されます */}
        <main>{children}</main>
      </body>
    </html>
  );
}
