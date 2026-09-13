"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function PWA() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || !window.isSecureContext) return;
    let alive = true;
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => { if (alive) setMessage("Chưa bật được chế độ cài ứng dụng. Bạn vẫn có thể chơi trên trình duyệt."); });
    const offer = (event: Event) => { event.preventDefault(); if (!sessionStorage.getItem("caudao-install-dismissed")) setInstall(event as InstallEvent); };
    const installed = () => setInstall(null);
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installed);
    return () => { alive = false; window.removeEventListener("beforeinstallprompt", offer); window.removeEventListener("appinstalled", installed); };
  }, []);
  if (!install && !message) return null;
  return <aside className="install-banner" aria-label="Cài ứng dụng"><div><strong>{message ? "Thông báo ứng dụng" : "Mang động phủ theo bạn"}</strong><p className="fine-print">{message || "Cài lối vào trên màn hình chính. Chơi game vẫn cần kết nối mạng."}</p></div>{install && <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { await install.prompt(); await install.userChoice; setInstall(null); } catch { setMessage("Chưa cài được ứng dụng. Hãy thử lại từ menu trình duyệt."); } finally { setBusy(false); } }}><Download size={16} />Cài</button>}<button className="icon-button" aria-label="Đóng lời mời cài đặt" onClick={() => { sessionStorage.setItem("caudao-install-dismissed", "1"); setInstall(null); setMessage(""); }}><X size={17} /></button></aside>;
}
