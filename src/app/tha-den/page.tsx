import type { Metadata } from "next";
import LanternEntry from "@/lantern/LanternEntry";

export const metadata: Metadata = {
  title: "Thả Thiên Đăng — đèn ước nguyện Giáng Sinh & Tết",
  description: "Viết một điều ước, thả đèn trời bay lên cùng mọi người, nhận quẻ Thiên Đăng hài hước và lưu thẻ ảnh để khoe. Miễn phí, không cần đăng ký.",
  openGraph: {
    title: "Thả Thiên Đăng — đèn ước nguyện Giáng Sinh & Tết",
    description: "Thả đèn ước nguyện cùng mọi người, nhận quẻ đầu mùa. Không cần đăng ký.",
    images: [{ url: "/ui/sky-noel.jpg", width: 1600, height: 900 }],
  },
};

export default function Page() {
  return <LanternEntry />;
}
