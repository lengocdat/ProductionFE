'use client';

import { useRef, useState, type FormEvent } from 'react';
import { APIError, request } from '../api';
import type { GameProps } from '../types';

type Account = { id: number; username: string; email: string; role: string; status: string; created_at: string };
type Report = { id: number; reporter_id: number; user_id: number; text: string; status: string; resolution: string; created_at: string; resolved_at: string | null; resolved_by: number | null };
type Support = { id: number; user_id: number; subject: string; text: string; status: string; reply: string; created_at: string; updated_at: string; replied_at: string | null; replied_by: number | null };
type Feed = { id: number; user_id: number; name: string; text: string; kind: string; created_at: string; removed_at: string | null; removed_by: number | null; removal_reason: string };
type Evidence = { provider_transaction_id: number; direction: 'in' | 'out'; amount: number; external_reference: string; transaction_at: string; refund_recorded_at: string | null };
type AdminOrder = { id: string; user_id: number; product_id: string; product_name: string; amount: number; currency: string; status: string; created_at: string; paid_at: string | null; provider_transaction_id: number | null; refund_reason: string; refund_requested_at: string | null; refunded_at: string | null; external_reference: string | null; transfer_content: string; payment_evidence: Evidence[] };
type Audit = { id: number; actor_id: number; request_id: string; action: string; target: string; payload: Record<string, unknown>; before_state: Record<string, unknown>; after_state: Record<string, unknown>; created_at: string };
type Overview = { page: number; page_size: number; metrics: Record<string, number>; users: Account[]; reports: Report[]; support: Support[]; feed: Feed[]; orders: AdminOrder[]; audit: Audit[] };
type Section = 'users' | 'reports' | 'feed' | 'support' | 'orders' | 'audit';
type Draft = { type: string; label: string; payload: Record<string, unknown>; reason: string; reply: string; status: string; reference: string };
const sections: { id: Section; label: string }[] = [{ id: 'users', label: 'Tài khoản' }, { id: 'reports', label: 'Báo cáo' }, { id: 'feed', label: 'Bảng tin' }, { id: 'support', label: 'Hỗ trợ' }, { id: 'orders', label: 'Thanh toán' }, { id: 'audit', label: 'Nhật ký quản trị' }];
const metricLabels: Record<string, string> = { accounts: 'Tài khoản', players: 'Nhân vật', active_today: 'Hoạt động trong 24 giờ', open_reports: 'Báo cáo chờ xử lý', open_support: 'Yêu cầu hỗ trợ mở', refund_requests: 'Yêu cầu hoàn tiền', received_vnd: 'Đã nhận (VND)', refunded_vnd: 'Đã hoàn (VND)' };
const statuses: Record<string, string> = { ACTIVE: 'Hoạt động', BANNED: 'Đã khóa', INACTIVE: 'Chưa hoạt động', open: 'Chờ xử lý', resolved: 'Đã xử lý', answered: 'Đã trả lời', closed: 'Đã đóng', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', refund_requested: 'Yêu cầu hoàn tiền', refunded: 'Đã ghi nhận hoàn tiền' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có';
const amount = (value: number) => value.toLocaleString('vi-VN');
const status = (value: string) => statuses[value] || value;
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể xử lý yêu cầu quản trị.';

export default function Admin({ busy }: GameProps) {
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [section, setSection] = useState<Section>('reports');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const inFlight = useRef(false);
  const editor = useRef<HTMLElement | null>(null);
  const disabled = busy || loading;
  const otpValid = /^\d{6}$/.test(code);

  function hideProtected(error: unknown) {
    if (error instanceof APIError && [401, 403, 429, 503].includes(error.status)) setData(null);
  }

  async function load(page = 1) {
    if (inFlight.current || busy) return;
    if (!otpValid) { setError('Nhập mã TOTP gồm 6 chữ số để truy cập.'); return; }
    inFlight.current = true;
    setLoading(true); setError(''); setSuccess('');
    try {
      const result = await request<Overview>(`/game/admin?page=${page}&q=${encodeURIComponent(query.trim())}`, { headers: { 'X-Admin-TOTP': code } });
      setData(result);
    } catch (failure) { setError(message(failure)); hideProtected(failure); }
    finally { setCode(''); setLoading(false); inFlight.current = false; }
  }

  function choose(type: string, label: string, payload: Record<string, unknown>, reference = '') {
    if (uncertain) return;
    pending.current = null;
    setDraft({ type, label, payload, reason: '', reply: '', status: 'answered', reference });
    setConfirmed(false); setError(''); setSuccess('');
    requestAnimationFrame(() => editor.current?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || inFlight.current || busy) return;
    if (!otpValid) { setError('Nhập mã TOTP hiện tại trước khi xác nhận thao tác.'); return; }
    if (!confirmed) { setError('Cần xác nhận đã kiểm tra bản ghi và lý do xử lý.'); return; }
    const payload: Record<string, unknown> = { ...draft.payload, reason: draft.reason.trim() };
    if (draft.type === 'support.reply') { payload.reply = draft.reply.trim(); payload.status = draft.status; }
    if (draft.type === 'order.refund-record') payload.external_reference = draft.reference.trim();
    const signature = JSON.stringify({ type: draft.type, payload });
    if (!pending.current || pending.current.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    const requestID = pending.current.id;
    inFlight.current = true; setLoading(true); setError(''); setSuccess('');
    const totp = code;
    try {
      await request<{ ok: true }>('/game/admin/actions', { method: 'POST', headers: { 'X-Admin-TOTP': totp }, body: JSON.stringify({ request_id: requestID, type: draft.type, payload }) });
      setSuccess(draft.type === 'order.refund-record' ? `Đã ghi nhận khoản hoàn tiền có chứng từ đối soát. Không có lệnh chuyển tiền nào được tạo từ bảng quản trị. Mã yêu cầu: ${requestID}.` : `Đã thực hiện và lưu nhật ký quản trị. Mã yêu cầu: ${requestID}.`);
      setDraft(null); setConfirmed(false); setUncertain(false); pending.current = null;
      // Refresh is a separate protected access, with the same still-current OTP header.
      try {
        const refreshed = await request<Overview>(`/game/admin?page=${data?.page || 1}&q=${encodeURIComponent(query.trim())}`, { headers: { 'X-Admin-TOTP': totp } });
        setData(refreshed);
      } catch (failure) { setData(null); setError(`Thao tác đã hoàn tất nhưng chưa tải lại được dữ liệu: ${message(failure)} Nhập mã TOTP mới để tải lại.`); }
    } catch (failure) {
      const ambiguous = failure instanceof APIError && failure.ambiguous;
      setUncertain(ambiguous);
      setError(`${message(failure)}${ambiguous ? ` Chưa xác định kết quả. Giữ nguyên thao tác và thử lại với cùng mã yêu cầu ${requestID}; máy chủ không thực hiện lặp.` : ''}`);
      hideProtected(failure);
    } finally { setCode(''); setLoading(false); inFlight.current = false; }
  }

  function lock() {
    setData(null); setCode(''); setQuery(''); setError(''); setSuccess('');
    if (!uncertain) { setDraft(null); pending.current = null; }
  }

  return <div className="game-view stack">
    <header className="page-heading"><p className="eyebrow">Cẩu Đạo Ký / Vận hành</p><h1>Giám sát giang hồ</h1><p className="muted">Chỉ dành cho tài khoản ADMIN đang hoạt động. Mọi lần truy cập và thao tác đều được máy chủ kiểm tra quyền và mã TOTP.</p></header>
    <section className="panel stack" aria-labelledby="admin-access">
      <h2 id="admin-access">Xác thực quản trị</h2>
      <p className="muted">Mã chỉ giữ trong bộ nhớ và được xóa sau mỗi yêu cầu. Không nhập khóa bí mật. Sau 5 mã sai, truy cập bị khóa 5 phút. Bảng này không tạo quản trị viên hoặc cấp quyền.</p>
      <form className="stack" onSubmit={event => { event.preventDefault(); void load(1); }}>
        <div className="split-grid">
          <label className="field">Mã TOTP hiện tại<input type="text" inputMode="numeric" autoComplete="one-time-code" value={code} pattern="[0-9]{6}" maxLength={6} required onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={disabled} aria-describedby="admin-code-help" /></label>
          <label className="field">Tìm kiếm bản ghi<input type="search" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} disabled={disabled} placeholder="ID, tên, email, trạng thái hoặc mã chuyển khoản" /></label>
        </div>
        <p id="admin-code-help" className="muted">Nhập mã mới trước khi tải dữ liệu, đổi trang hoặc xác nhận thao tác. Tìm kiếm áp dụng cho tất cả danh sách; xóa từ khóa để xem lại toàn bộ.</p>
        <div className="actions"><button className="button primary" type="submit" disabled={disabled || !otpValid}>{loading ? 'Đang xử lý…' : data ? 'Tải lại / tìm kiếm' : 'Mở bảng quản trị'}</button><button className="button secondary" type="button" disabled={disabled} onClick={lock}>Ẩn dữ liệu nhạy cảm</button></div>
      </form>
    </section>
    {error && <p className="notice error" role="alert">{error}</p>}
    {success && <p className="notice success" role="status">{success}</p>}
    {draft && <section className="panel stack" ref={editor} aria-labelledby="admin-action">
      <h2 id="admin-action">{draft.label}</h2>
      <p className="muted">Loại thao tác: <code>{draft.type}</code>. Dữ liệu trước và sau cùng lý do sẽ được lưu vào nhật ký chỉ ghi thêm.</p>
      {draft.type === 'order.refund-record' && <p className="notice">Chỉ ghi nhận tiền đã thực sự chuyển trả bên ngoài. Máy chủ phải có webhook SePay chiều ra khớp đơn, số tiền và tài khoản; mã tham chiếu phải khớp chứng từ đó. Nút này không gửi lệnh chuyển tiền và không thể tự tạo hoàn tiền thành công.</p>}
      <form className="stack" onSubmit={event => void submit(event)}>
        <label className="field">Lý do / kết luận xử lý<textarea value={draft.reason} onChange={event => setDraft({ ...draft, reason: event.target.value })} minLength={3} maxLength={1000} rows={3} required disabled={disabled || uncertain} /></label>
        {draft.type === 'support.reply' && <>
          <label className="field">Trả lời người chơi<textarea value={draft.reply} onChange={event => setDraft({ ...draft, reply: event.target.value })} minLength={3} maxLength={4000} rows={5} required disabled={disabled || uncertain} /></label>
          <label className="field">Trạng thái sau phản hồi<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })} disabled={disabled || uncertain}><option value="answered">Đã trả lời</option><option value="closed">Đóng yêu cầu</option></select></label>
        </>}
        {draft.type === 'order.refund-record' && <label className="field">Mã tham chiếu giao dịch hoàn tiền thực tế<input value={draft.reference} onChange={event => setDraft({ ...draft, reference: event.target.value })} minLength={1} maxLength={200} required disabled={disabled || uncertain} /></label>}
        <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={disabled || uncertain} required /> Tôi đã kiểm tra đúng bản ghi, nội dung và chứng từ liên quan.</label>
        <div className="actions"><button type="submit" className="button danger" disabled={disabled || !confirmed || !otpValid}>{uncertain ? 'Thử lại cùng mã yêu cầu' : 'Xác nhận và ghi nhật ký'}</button><button type="button" className="button secondary" disabled={disabled || uncertain} onClick={() => { setDraft(null); pending.current = null; setConfirmed(false); }}>Hủy thao tác</button></div>
        {!otpValid && <p className="muted">Nhập mã TOTP ở mục xác thực phía trên để xác nhận.</p>}
      </form>
    </section>}
    {!data ? <p className="empty">Chưa có dữ liệu quản trị được xác thực. Không hiển thị tài khoản, giao dịch hoặc báo cáo giả.</p> : <>
      <section className="stat-grid" aria-label="Số liệu vận hành">{Object.entries(metricLabels).map(([key, label]) => <div className="stat" key={key}><span className="muted">{label}</span><strong>{amount(data.metrics[key] ?? 0)}</strong></div>)}</section>
      <p className="muted">Hoạt động 24 giờ được tính theo lần cập nhật nhân vật, không phải số người đang trực tuyến. Tổng đã nhận bao gồm cả đơn đã hoàn; tiền hoàn được thống kê riêng.</p>
      <nav className="tabs" aria-label="Danh mục quản trị">{sections.map(item => <button key={item.id} type="button" className={`tab ${section === item.id ? 'active' : ''}`} aria-pressed={section === item.id} onClick={() => setSection(item.id)}>{item.label} ({data[item.id].length})</button>)}</nav>
      <section className="stack" aria-label={sections.find(item => item.id === section)?.label}>
        {data[section].length === 0 && <p className="empty">Không có bản ghi phù hợp trên trang này. Thử trang trước hoặc xóa từ khóa tìm kiếm.</p>}
        {section === 'users' && data.users.map(user => <article className="card stack" key={user.id}>
          <div className="section-heading"><h3>{user.username} · #{user.id}</h3><span className="badge">{status(user.status)}</span></div>
          <p style={{ overflowWrap: 'anywhere' }}>{user.email}</p><p className="muted">Quyền: {user.role} · Tạo lúc {date(user.created_at)}</p>
          <button type="button" className={`button ${user.status === 'ACTIVE' ? 'danger' : 'secondary'}`} disabled={disabled || uncertain} onClick={() => choose('user.status', `${user.status === 'ACTIVE' ? 'Khóa' : 'Kích hoạt'} tài khoản ${user.username} (#${user.id})`, { user_id: user.id, status: user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE' })}>{user.status === 'ACTIVE' ? 'Khóa tài khoản và thu hồi phiên' : 'Kích hoạt tài khoản'}</button>
        </article>)}
        {section === 'reports' && data.reports.map(report => <article className="card stack" key={report.id}>
          <div className="section-heading"><h3>Báo cáo #{report.id}</h3><span className="badge">{status(report.status)}</span></div>
          <p className="muted">Người gửi #{report.reporter_id} · Tài khoản bị báo cáo #{report.user_id} · {date(report.created_at)}</p><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.text}</p>
          {report.resolution && <p style={{ whiteSpace: 'pre-wrap' }}>Kết luận: {report.resolution}</p>}
          {report.resolved_at && <p className="muted">Xử lý bởi #{report.resolved_by} · {date(report.resolved_at)}</p>}
          {report.status === 'open' && <button type="button" className="button secondary" disabled={disabled || uncertain} onClick={() => choose('report.resolve', `Kết luận báo cáo #${report.id}`, { id: report.id })}>Xử lý báo cáo</button>}
        </article>)}
        {section === 'feed' && data.feed.map(post => <article className="card stack" key={post.id}>
          <div className="section-heading"><h3>{post.name} · bài #{post.id}</h3><span className="badge">{post.removed_at ? 'Đã gỡ' : 'Đang hiển thị'}</span></div>
          <p className="muted">Tài khoản #{post.user_id} · {date(post.created_at)}</p><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{post.text}</p>
          {post.removed_at ? <p className="muted">Gỡ bởi #{post.removed_by} · {date(post.removed_at)} · {post.removal_reason}</p> : <button type="button" className="button danger" disabled={disabled || uncertain} onClick={() => choose('feed.remove', `Gỡ bài viết #${post.id} của ${post.name}`, { id: post.id })}>Gỡ nội dung vi phạm</button>}
        </article>)}
        {section === 'support' && data.support.map(ticket => <article className="card stack" key={ticket.id}>
          <div className="section-heading"><h3>#{ticket.id} · {ticket.subject}</h3><span className="badge">{status(ticket.status)}</span></div>
          <p className="muted">Tài khoản #{ticket.user_id} · {date(ticket.created_at)}</p><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ticket.text}</p>
          {ticket.reply && <div className="notice"><strong>Phản hồi hiện tại</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ticket.reply}</p><p className="muted">Bởi #{ticket.replied_by} · {date(ticket.replied_at)}</p></div>}
          <button type="button" className="button secondary" disabled={disabled || uncertain} onClick={() => choose('support.reply', `Trả lời yêu cầu #${ticket.id}: ${ticket.subject}`, { id: ticket.id })}>{ticket.reply ? 'Cập nhật phản hồi / trạng thái' : 'Trả lời người chơi'}</button>
        </article>)}
        {section === 'orders' && data.orders.map(order => <article className="card stack" key={order.id}>
          <div className="section-heading"><h3>{order.product_name}</h3><span className="badge">{status(order.status)}</span></div>
          <p style={{ overflowWrap: 'anywhere' }}>Đơn {order.id} · Tài khoản #{order.user_id}</p><strong>{amount(order.amount)} {order.currency}</strong>
          <p className="muted">Tạo {date(order.created_at)} · Thanh toán {date(order.paid_at)}</p><p>Mã nội dung chuyển khoản: <code>{order.transfer_content}</code></p>
          {order.refund_reason && <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Yêu cầu hoàn ({date(order.refund_requested_at)}): {order.refund_reason}</p>}
          {order.refunded_at && <p className="notice success">Ghi nhận hoàn lúc {date(order.refunded_at)} · Tham chiếu {order.external_reference}</p>}
          <details><summary>Chứng từ webhook đã xác thực ({order.payment_evidence.length})</summary><div className="stack">
            {order.payment_evidence.length === 0 && <p className="muted">Chưa nhận được chứng từ từ nhà cung cấp.</p>}
            {order.payment_evidence.map(proof => <div className="notice" key={proof.provider_transaction_id}>
              <strong>{proof.direction === 'in' ? 'Tiền vào' : 'Tiền ra'} · {amount(proof.amount)} VND</strong><p style={{ overflowWrap: 'anywhere' }}>SePay #{proof.provider_transaction_id} · Tham chiếu: {proof.external_reference || 'Không có'} · {date(proof.transaction_at)}</p>
              {proof.refund_recorded_at && <p>Đã dùng ghi nhận hoàn: {date(proof.refund_recorded_at)}</p>}
              {['paid', 'refund_requested'].includes(order.status) && proof.direction === 'out' && proof.amount === order.amount && proof.external_reference && !proof.refund_recorded_at && <button type="button" className="button danger" disabled={disabled || uncertain} onClick={() => choose('order.refund-record', `Ghi nhận hoàn đơn ${order.id}`, { order_id: order.id }, proof.external_reference)}>Đối soát và ghi nhận khoản hoàn này</button>}
            </div>)}
          </div></details>
          {['paid', 'refund_requested'].includes(order.status) && !order.payment_evidence.some(proof => proof.direction === 'out' && proof.amount === order.amount && !!proof.external_reference && !proof.refund_recorded_at) && <p className="notice">Chưa có chứng từ tiền ra phù hợp. Hoàn tiền phải được thực hiện qua quy trình ngân hàng bên ngoài, sau đó nhận webhook xác thực trước khi ghi nhận tại đây.</p>}
        </article>)}
        {section === 'audit' && data.audit.map(entry => <article className="card stack" key={entry.id}>
          <h3>#{entry.id} · {entry.action}</h3><p className="muted">Quản trị viên #{entry.actor_id} · Đối tượng {entry.target} · {date(entry.created_at)}</p><p style={{ overflowWrap: 'anywhere' }}>Mã yêu cầu: <code>{entry.request_id}</code></p>
          <details><summary>Xem lý do và thay đổi đã ghi nhận</summary><div className="stack">{[{ name: 'Nội dung thao tác', value: entry.payload }, { name: 'Trước xử lý', value: entry.before_state }, { name: 'Sau xử lý', value: entry.after_state }].map(item => <div key={item.name}><h4>{item.name}</h4><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.85rem' }}>{JSON.stringify(item.value, null, 2)}</pre></div>)}</div></details>
        </article>)}
      </section>
      <div className="actions" aria-label="Phân trang"><button type="button" className="button secondary" disabled={disabled || !otpValid || data.page <= 1} onClick={() => void load(data.page - 1)}>Trang trước</button><span>Trang {data.page} · tối đa {data.page_size} bản ghi mỗi danh mục</span><button type="button" className="button secondary" disabled={disabled || !otpValid || data[section].length < data.page_size || data.page >= 100000} onClick={() => void load(data.page + 1)}>Trang tiếp</button></div>
    </>}
  </div>;
}
