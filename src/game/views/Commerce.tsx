'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { APIError, request } from '../api';
import type { GameProps, Order, Product } from '../types';
import { ProductArt } from "../CosmeticArt";

const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
const statuses: Record<string, string> = { pending: 'Chờ chuyển khoản', paid: 'Đã đối soát', refund_requested: 'Đang yêu cầu hoàn', refunded: 'Đã hoàn tiền' };
const categories = [{ id: 'all', name: 'Tất cả' }, { id: 'robe', name: 'Đạo bào' }, { id: 'seal', name: 'Ấn danh' }, { id: 'landscape', name: 'Khung cảnh' }, { id: 'season', name: 'Vé mùa' }];



export default function Commerce({ snapshot, act, busy }: GameProps) {
  const player = snapshot.player;
  const [category, setCategory] = useState('all');
  const [preview, setPreview] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const requestIDs = useRef<Record<string, string>>({});
  const running = useRef(false);
  const mounted = useRef(true);
  const orderFlight = useRef(0);
  const playerID = player?.id;

  const loadOrders = useCallback(async () => {
    const flight = ++orderFlight.current;
    try {
      const data = await request<{ orders: Order[] }>('/game/orders');
      if (mounted.current && flight === orderFlight.current) setOrders(data.orders);
    } finally {
      if (mounted.current && flight === orderFlight.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    const controller = new AbortController();
    const flight = ++orderFlight.current;
    void request<{ orders: Order[] }>('/game/orders', { signal: controller.signal }).then(data => {
      if (flight === orderFlight.current) setOrders(data.orders);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được đơn hàng.');
    }).finally(() => { if (!controller.signal.aborted && flight === orderFlight.current) setLoading(false); });
    return () => { mounted.current = false; controller.abort(); };
  }, [playerID]);

  const perform = async (operation: () => Promise<void>) => {
    if (running.current || busy) return;
    running.current = true;
    setPending(true); setError(''); setNotice('');
    try { await operation(); } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Không thực hiện được thao tác.');
    } finally { running.current = false; if (mounted.current) setPending(false); }
  };

  const createOrder = (product: Product) => perform(async () => {
    const requestID = requestIDs.current[product.id] ?? crypto.randomUUID();
    requestIDs.current[product.id] = requestID;
    try {
      const data = await request<{ order: Order }>('/game/orders', { method: 'POST', body: JSON.stringify({ product_id: product.id, request_id: requestID }) });
      delete requestIDs.current[product.id];
      if (!mounted.current) return;
      setOrders(previous => [data.order, ...previous.filter(order => order.id !== data.order.id)]);
      setSelectedID(data.order.id);
      setNotice('Đơn đã được tạo theo giá máy chủ. Chỉ chuyển khoản theo thông tin của đơn bên dưới.');
    } catch (cause) {
      if (cause instanceof APIError && !cause.ambiguous) delete requestIDs.current[product.id];
      throw cause;
    }
  });

  const refresh = () => perform(async () => {
    await loadOrders();
    window.dispatchEvent(new Event('game:refresh'));
    setNotice('Đã tải trạng thái đơn từ máy chủ. Chuyển tiền không đồng nghĩa đã được đối soát.');
  });

  if (!player) return null;
  const disabled = busy || pending;
  const selected = orders.find(order => order.id === selectedID);
  const owned = (product: Product) => product.kind === 'season' ? player.season_premium : player.cosmetics.includes(product.cosmetic);
  const filtered = snapshot.catalog.products.filter(product => category === 'all' || product.preview === category);
  const style = { '--commerce-color': preview?.color ?? '#76b593' } as CSSProperties;

  return <div className="game-view stack" style={style}>
    <header className="page-heading"><div><span className="eyebrow">Ngoại hình, không bán sức mạnh</span><h1>Vạn Bảo Các</h1><p className="muted">Đạo bào, ấn danh và khung cảnh cho hành trình của riêng đạo hữu. Giá niêm yết một lần, không tự gia hạn.</p></div><span className="badge">{player.jade.toLocaleString('vi-VN')} ngọc</span></header>
    <div className="notice">Mọi món bán ở đây chỉ đổi diện mạo. Không bán tu vi, chỉ số đấu pháp, vé quay hay ngọc. Vé mùa vẫn cần kinh nghiệm kiếm từ chơi; tuyến đã mua không hết hạn theo đồng hồ.</div>
    {!snapshot.payments_enabled && <div className="notice" role="status"><strong>Thanh toán tiền thật đang tắt.</strong><p>Chưa mở tiếp nhận chuyển khoản. Không gửi tiền vào bất kỳ đơn cũ nào. Đạo hữu vẫn có thể xem trước, đổi bằng ngọc đang sở hữu và yêu cầu hỗ trợ hoàn đơn đã thanh toán.</p></div>}
    {error && <div className="notice error" role="alert">{error}</div>}
    {notice && <div className="notice success" role="status">{notice}</div>}
    <div className="tabs" aria-label="Nhóm sản phẩm">{categories.map(item => <button key={item.id} className={`tab ${category === item.id ? 'active' : ''}`} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div>
    {preview && <section className="panel split-grid" aria-label="Chi tiết ngoại hình"><ProductArt product={preview} large /><div className="stack"><span className="eyebrow">Xem trước · {preview.kind === 'season' ? '20 mốc ngoại hình' : 'Trang trí đạo danh'}</span><h2>{preview.name}</h2><p>{preview.description}</p><p className="muted">Bản xem trước minh họa diện mạo trong hồ sơ, không phải trang bị chiến đấu.</p><p><strong>{money(preview.price_vnd)}</strong>{preview.price_jade > 0 && ` hoặc ${preview.price_jade} ngọc`}</p><button className="button secondary" onClick={() => setPreview(null)}>Đóng xem trước</button></div></section>}
    <div className="card-grid">{filtered.map(product => {
      const isOwned = owned(product);
      const waiting = orders.find(order => order.product_id === product.id && order.status === 'pending');
      return <article className="card stack" key={product.id}>
        <button type="button" aria-label={`Xem trước ${product.name}`} onClick={() => setPreview(product)} style={{ padding: 0, border: 0, background: 'none', cursor: 'pointer', width: '100%' }}><ProductArt product={product} /></button>
        <h3>{product.name}</h3><p className="muted">{product.description}</p>
        <div className="section-heading"><strong>{money(product.price_vnd)}</strong>{isOwned && <span className="badge">Đã sở hữu</span>}</div>
        <div className="actions"><button className="button secondary" onClick={() => setPreview(product)}>Xem trước</button>
          {isOwned ? product.kind === 'cosmetic' && <button className="button primary" disabled={disabled || player.equipped_cosmetic === product.cosmetic} onClick={() => void perform(() => act('cosmetic.equip', { id: product.cosmetic }))}>{player.equipped_cosmetic === product.cosmetic ? 'Đang dùng' : 'Sử dụng'}</button> : <>
            {waiting ? <button className="button secondary" onClick={() => { setSelectedID(waiting.id); setRefundReason(''); }}>Mở đơn đang chờ</button> : <button className="button primary" disabled={disabled || !snapshot.payments_enabled} onClick={() => void createOrder(product)}>Tạo đơn chuyển khoản</button>}
            {product.price_jade > 0 && <button className="button secondary" disabled={disabled || !!waiting || player.jade < product.price_jade} onClick={() => void perform(() => act('shop.buy', { id: product.id }))}>Đổi {product.price_jade} ngọc</button>}
          </>}
        </div>
      </article>;
    })}</div>
    <section className="panel stack" id="commerce-orders"><div className="section-heading"><div><span className="eyebrow">Dữ liệu đối soát thực</span><h2>Lịch sử đơn hàng</h2></div><button className="button secondary" disabled={disabled} onClick={() => void refresh()}>Cập nhật đơn và đạo đồ</button></div>
      {loading ? <p role="status">Đang tải đơn hàng…</p> : orders.length === 0 ? <div className="empty">Chưa có đơn hàng. Cửa tiệm không tự tạo giao dịch hoặc cấp ngoại hình thử.</div> : <div className="stack">{orders.map(order => <article className="card" key={order.id}><div className="section-heading"><h3>{order.product_name}</h3><span className="badge">{statuses[order.status] ?? order.status}</span></div><p>{money(order.amount)} · {new Date(order.created_at).toLocaleString('vi-VN')}</p><p className="muted" style={{ overflowWrap: 'anywhere' }}>Mã đơn: {order.id}</p><button className="button secondary" onClick={() => { setSelectedID(order.id); setRefundReason(''); }}>Chi tiết đơn</button></article>)}</div>}
    </section>
    {selected && <section className="panel stack" aria-label="Chi tiết đơn hàng"><div className="section-heading"><h2>{selected.product_name}</h2><button className="button secondary" onClick={() => setSelectedID(null)}>Đóng đơn</button></div>
      <p><span className="badge">{statuses[selected.status] ?? selected.status}</span> · <strong>{money(selected.amount)}</strong></p>
      <p className="muted" style={{ overflowWrap: 'anywhere' }}>Mã đơn {selected.id}</p>
      {selected.status === 'pending' && (snapshot.payments_enabled ? <>
        <div className="notice">Chỉ chuyển đúng số tiền và toàn bộ nội dung dưới đây. Mỗi đơn chỉ chuyển một lần. Không có nút tự xác nhận thanh toán; ngoại hình chỉ được cấp sau thông báo ngân hàng đã xác thực.</div>
        <dl className="stack"><div><dt>Ngân hàng</dt><dd>{selected.bank_name}</dd></div><div><dt>Số tài khoản</dt><dd style={{ overflowWrap: 'anywhere' }}>{selected.bank_account}</dd></div><div><dt>Chủ tài khoản</dt><dd>{selected.bank_holder}</dd></div><div><dt>Số tiền chính xác</dt><dd>{money(selected.amount)}</dd></div><div><dt>Nội dung chuyển khoản</dt><dd style={{ overflowWrap: 'anywhere' }}><code>{selected.transfer_content}</code></dd></div></dl>
        <button className="button secondary" disabled={disabled} onClick={() => void perform(async () => { await navigator.clipboard.writeText(selected.transfer_content); setNotice('Đã sao chép nội dung chuyển khoản.'); })}>Sao chép nội dung</button>
      </> : <div className="notice">Thanh toán đang tắt. Không chuyển tiền theo đơn này.</div>)}
      {selected.paid_at && <p>Ngân hàng ghi nhận: {new Date(selected.paid_at).toLocaleString('vi-VN')}</p>}
      {selected.status === 'paid' && <form className="stack" onSubmit={event => { event.preventDefault(); void perform(async () => {
        const data = await request<{ order: Order }>(`/game/orders/${selected.id}/refund-request`, { method: 'POST', body: JSON.stringify({ reason: refundReason.trim() }) });
        setOrders(previous => previous.map(order => order.id === data.order.id ? data.order : order));
        setRefundReason(''); setNotice('Đã gửi yêu cầu. Đây chưa phải thông báo hoàn tiền.');
      }); }}><h3>Yêu cầu hoàn tiền</h3><p className="muted">Bộ phận hỗ trợ sẽ đối soát. Chỉ sau khi có chứng từ tiền ra và quản trị xác nhận, đơn mới là đã hoàn. Ngoại hình của đơn sẽ bị thu hồi; hoàn vé mùa thu hồi tuyến và ngoại hình premium đã nhận, giữ nguyên tuyến miễn phí cùng tiến trình chiến đấu.</p><label className="field">Lý do (10–1.000 ký tự)<textarea required minLength={10} maxLength={1000} rows={4} value={refundReason} onChange={event => setRefundReason(event.target.value)} /></label><button className="button secondary" disabled={disabled || refundReason.trim().length < 10}>Gửi yêu cầu hoàn tiền</button></form>}
      {selected.status === 'refund_requested' && <div className="notice">Yêu cầu đang được đối soát. Chưa ghi nhận hoàn tiền; quyền ngoại hình giữ nguyên đến khi giao dịch hoàn được xác minh.</div>}
      {selected.status === 'refunded' && <div className="notice success">Hoàn tiền đã được đối soát với giao dịch ngân hàng. Quyền ngoại hình của đơn đã được thu hồi, không trừ vật phẩm chiến đấu.</div>}
    </section>}
  </div>;
}
