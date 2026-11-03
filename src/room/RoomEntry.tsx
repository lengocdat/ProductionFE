"use client";

import dynamic from "next/dynamic";

// Three.js and WebSocket need the browser; skip server rendering entirely.
const RoomView = dynamic(() => import("@/room/RoomView"), { ssr: false });

export default function RoomEntry() {
  return <RoomView />;
}
