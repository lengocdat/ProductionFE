import type { Metadata } from "next";
import RoomEntry from "./RoomEntry";

export const metadata: Metadata = {
  title: "Đạo Tràng Online",
  description: "Cùng các đạo hữu tĩnh toạ trong một đạo tràng chung: thấy nhau, trò chuyện, hấp thụ linh khí.",
};

export default function Page() {
  return <RoomEntry />;
}
