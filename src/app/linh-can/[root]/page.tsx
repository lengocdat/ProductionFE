import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LinhCan from "@/linhcan/LinhCan";
import { ROOTS, ROOT_IDS, isRootId } from "@/linhcan/quiz";

// One prebuilt page per result, so a viral share link never needs the server to render anything.
export const dynamicParams = false;

export function generateStaticParams() {
  return ROOT_IDS.map(root => ({ root }));
}

type Props = { params: Promise<{ root: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { root } = await params;
  if (!isRootId(root)) return {};
  const title = `Tôi là ${ROOTS[root].name} ${ROOTS[root].school}. Còn bạn?`;
  const description = "Tám câu hỏi, một phút, biết ngay linh căn và khắc tinh của bạn. Không cần đăng ký. Trò đùa cho vui, không phải bói toán.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images: [{ url: "/ui/bg-join.jpg", width: 1600, height: 900 }] },
  };
}

export default async function Page({ params }: Props) {
  const { root } = await params;
  if (!isRootId(root)) notFound();
  return <LinhCan friendRoot={root} />;
}
