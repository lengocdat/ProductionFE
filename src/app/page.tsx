import RoomEntry from "@/room/RoomEntry";

// Đạo Tràng Online is the product: guests walk straight in, no account needed. The old
// account-based idle game is frozen (see TU_TIEN_ONLINE_PLAN.md); only /admin still uses it.
export default function Page() {
  return <RoomEntry />;
}
