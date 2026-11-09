import type { Metadata } from "next";
import LinhCan from "@/linhcan/LinhCan";
import { ROOTS, isRootId } from "@/linhcan/quiz";

type Props = { searchParams: Promise<{ r?: string | string[] }> };

async function friendRoot(searchParams: Props["searchParams"]) {
  const { r } = await searchParams;
  return isRootId(r) ? r : null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const root = await friendRoot(searchParams);
  const title = root ? `Tôi là ${ROOTS[root].name} ${ROOTS[root].school}. Còn bạn?` : "Test Linh Căn: bạn mang linh căn gì?";
  const description = "Tám câu hỏi, một phút, biết ngay linh căn và khắc tinh của bạn. Không cần đăng ký. Trò đùa cho vui, không phải bói toán.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images: [{ url: "/ui/bg-join.jpg", width: 1600, height: 900 }] },
  };
}

export default async function Page({ searchParams }: Props) {
  return <LinhCan friendRoot={await friendRoot(searchParams)} />;
}
