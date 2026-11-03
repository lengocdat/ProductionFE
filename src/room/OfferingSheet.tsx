"use client";

import { useEffect, useState } from "react";
import type { RoomClient } from "./RoomClient";
import type { OfferingItem, OfferingOrder, RecentOffering } from "./protocol";

type Props = {
  client: RoomClient;
  items: readonly OfferingItem[];
  /** False until the operator opens payments: catalogue is shown, ordering is not. */
  paymentsOpen: boolean;
  onClose: () => void;
  showToast: (text: string) => void;
};

const POLL_MS = 4000;
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} giờ trước` : `${Math.round(hours / 24)} ngày trước`;
}

export default function OfferingSheet({ client, items, paymentsOpen, onClose, showToast }: Props) {
  const [recent, setRecent] = useState<RecentOffering[]>([]);
  const [order, setOrder] = useState<OfferingOrder | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.recentOfferings().then(setRecent, () => setRecent([]));
  }, [client]);

  // While an order waits for the bank transfer, ask the server every few seconds.
  useEffect(() => {
    if (!order || order.status === "paid") return;
    const id = window.setInterval(() => {
      client.offeringStatus(order.id).then(setOrder, () => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [client, order]);

  const choose = async (item: OfferingItem) => {
    setBusy(true);
    try {
      setOrder(await client.createOffering(item.id, crypto.randomUUID()));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Chưa tạo được lễ cúng.");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text).then(() => showToast(`Đã chép ${what}.`), () => showToast("Không chép được, hãy chép thủ công."));
  };

  const item = order ? items.find(i => i.id === order.offering) : undefined;

  return (
    <div className="dt-overlay dt-overlay--dim" role="dialog" aria-label="Cúng dường Thiên Đạo" onClick={onClose}>
      <div className="dt-glass dt-card dt-offer" onClick={ev => ev.stopPropagation()}>
        {!order ? (
          <>
            <img className="dt-offer-incense" src="/chanh-dien/nhang-linh-khi.png" alt="" />
            <h2 className="dt-title" style={{ fontSize: 26 }}>Cúng dường Thiên Đạo</h2>
            <p className="dt-sub">Thiên Đạo cũng phải ăn. Cúng xong <b>cả tông môn được phát lộc tu vi</b>, còn bạn được ghi tên vào Sổ Công Đức.</p>
            <ul className="dt-offer-list">
              {items.map(i => (
                <li key={i.id}>
                  <span className="dt-offer-emoji" aria-hidden="true">{i.emoji}</span>
                  <div className="dt-offer-body">
                    <b>{i.name}</b> <span className="dt-offer-price">{vnd(i.price)}</span>
                    <small>{i.blurb}</small>
                    <small>🎁 Mọi người đang online <b>+{i.gift} tu vi</b> · Bạn: {i.perk}</small>
                  </div>
                  <button type="button" className="dt-btn dt-btn--gold" disabled={!paymentsOpen || busy} onClick={() => void choose(i)}>
                    {paymentsOpen ? "Cúng" : "Sắp mở"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="dt-offer-note">
              {paymentsOpen ? "" : "Cúng dường chưa mở. Đừng chuyển tiền cho bất kỳ ai. "}
              Đây là ủng hộ đội làm game. Không mua được sức mạnh: tu vi phát đều cho mọi người, kể cả bạn.
            </p>
            {recent.length > 0 && (
              <section className="dt-offer-recent">
                <h3><img src="/chanh-dien/cuon-so.png" alt="" /> Sổ Công Đức</h3>
                <ol>{recent.map((r, k) => <li key={k}>{r.emoji} <b>{r.name}</b> cúng {r.item} · {ago(r.paid_at)}</li>)}</ol>
              </section>
            )}
          </>
        ) : order.status === "paid" ? (
          <>
            <div className="dt-offer-done" aria-hidden="true">{item?.emoji ?? "🙏"}</div>
            <h2 className="dt-title" style={{ fontSize: 26 }}>Thiên Đạo đã nhận lễ!</h2>
            <p className="dt-sub">Cả tông môn vừa được phát lộc. Đa tạ thí chủ 🙏</p>
          </>
        ) : (
          <>
            <h2 className="dt-title" style={{ fontSize: 24 }}>{item?.emoji} {item?.name}</h2>
            <p className="dt-sub">Chuyển khoản <b>đúng số tiền và đúng nội dung</b>. Thiên Đạo tự nhận lễ trong ít phút, không cần báo ai.</p>
            {order.qr_url && <img className="dt-offer-qr" src={order.qr_url} alt="Mã QR chuyển khoản" width={220} height={220} />}
            <dl className="dt-offer-bank">
              <div><dt>Ngân hàng</dt><dd>{order.bank_name}</dd></div>
              <div><dt>Số tài khoản</dt><dd>{order.bank_account} <button type="button" className="dt-btn dt-btn--ghost dt-chip-btn" onClick={() => copy(order.bank_account, "số tài khoản")}>Chép</button></dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{order.bank_holder}</dd></div>
              <div><dt>Số tiền</dt><dd><b>{vnd(order.amount)}</b></dd></div>
              <div><dt>Nội dung</dt><dd><code>{order.transfer_content}</code> <button type="button" className="dt-btn dt-btn--ghost dt-chip-btn" onClick={() => copy(order.transfer_content, "nội dung")}>Chép</button></dd></div>
            </dl>
            <p className="dt-offer-wait"><span className="dt-spin" /> Đang chờ Thiên Đạo nhận lễ…</p>
          </>
        )}
        <div className="dt-actions">
          <button type="button" className="dt-btn dt-btn--ghost" onClick={onClose}>{order?.status === "paid" ? "Đóng" : "Để sau"}</button>
        </div>
      </div>
    </div>
  );
}
