import type { Metadata } from "next";
import LinhCan from "@/linhcan/LinhCan";

const title = "Test Linh Căn: bạn mang linh căn gì?";
const description = "Tám câu hỏi, một phút, biết ngay linh căn và khắc tinh của bạn. Không cần đăng ký. Trò đùa cho vui, không phải bói toán.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, images: [{ url: "/ui/bg-join.jpg", width: 1600, height: 900 }] },
};

export default function Page() {
  return <LinhCan friendRoot={null} />;
}
