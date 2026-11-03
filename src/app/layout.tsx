import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../game/world.css";
import "../game/idle-cultivation.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_PUBLIC_URL || "https://coduyen.net"),
  title: { default: "Cẩu Đạo Ký — Một đời tự tại", template: "%s | Cẩu Đạo Ký" },
  description: "Một giang hồ, nhiều con đường thành tiên. Tu luyện nhàn nhã, gặp gỡ người hữu duyên và viết nên đạo đồ của riêng bạn. Không bán sức mạnh.",
  applicationName: "Cẩu Đạo Ký",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: { type: "website", locale: "vi_VN", siteName: "Cẩu Đạo Ký", title: "Cẩu Đạo Ký — Một đời tự tại", description: "Sống đủ lâu. Viết nên huyền thoại." },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#0b171b", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><a href="#main-content" className="skip-link">Đi tới nội dung</a>{children}</body></html>;
}
