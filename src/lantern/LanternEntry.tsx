"use client";

import dynamic from "next/dynamic";

// The season comes from the visitor's clock and ?mua=, and identity from localStorage: render in the browser only.
const LanternSky = dynamic(() => import("./LanternSky"), { ssr: false });

export default function LanternEntry() {
  return <LanternSky />;
}
