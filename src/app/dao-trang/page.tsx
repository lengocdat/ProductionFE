import { permanentRedirect } from "next/navigation";

// The room now lives at "/". Browsers keep the URL fragment across redirects, so old
// transfer links (/dao-trang#dt=…) still carry the đạo tịch to the new address.
export default function Page() {
  permanentRedirect("/");
}
