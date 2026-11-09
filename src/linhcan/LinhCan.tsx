"use client";

import { useEffect, useMemo, useState } from "react";
import { renderLinhCanCard } from "./card";
import { QUESTIONS, ROOTS, cleanCardName, scoreAnswers, type RootId } from "./quiz";
import "./linhcan.css";

const NAME_KEY = "linhcan.name";

/** Best effort: a lost count must never get in the visitor's way. */
function track(event: string, variant = ""): void {
  void fetch("/api/v1/room/metric", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, variant }),
    keepalive: true,
  }).catch(() => undefined);
}

function readName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

function writeName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* the name just isn't remembered */ }
}

export default function LinhCan({ friendRoot }: { friendRoot: RootId | null }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(readName());
    track("linhcan_view", friendRoot ? "shared" : "direct");
  }, [friendRoot]);

  const finished = answers.length === QUESTIONS.length;
  const rootId = useMemo(() => (finished ? scoreAnswers(answers) : null), [answers, finished]);
  const root = rootId ? ROOTS[rootId] : null;
  const friend = friendRoot ? ROOTS[friendRoot] : null;

  useEffect(() => {
    if (rootId) track("linhcan_result", rootId);
  }, [rootId]);

  const start = () => {
    setStarted(true);
    track("linhcan_start");
  };

  const restart = () => {
    setAnswers([]);
    setNote("");
  };

  const canShareFiles = useMemo(() => {
    if (typeof navigator === "undefined" || !navigator.canShare || typeof File === "undefined") return false;
    return navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });
  }, []);

  const shareLink = rootId ? `${typeof location === "undefined" ? "" : location.origin}/linh-can/${rootId}` : "";

  const deliver = async (mode: "share" | "save") => {
    if (!root || !rootId) return;
    setBusy(true);
    setNote("");
    const display = cleanCardName(name);
    writeName(name);
    try {
      const blob = await renderLinhCanCard(root, display);
      const file = new File([blob], "linh-can.png", { type: "image/png" });
      if (mode === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${root.name} ${root.school}`, text: `Linh căn của tôi là ${root.name} ${root.school}. Còn bạn? ${shareLink}` });
        track("linhcan_share", rootId);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "linh-can.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      track("linhcan_save", rootId);
      setNote("Đã lưu thẻ. Đăng lên rồi tag khắc tinh của bạn nhé.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // the share sheet was dismissed
      setNote("Chưa tạo được thẻ. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!rootId) return;
    try {
      await navigator.clipboard.writeText(`Linh căn của tôi là ${root?.name} ${root?.school}. Còn bạn? ${shareLink}`);
      track("linhcan_link", rootId);
      setNote("Đã chép lời thách đấu. Dán cho đồng môn thôi.");
    } catch {
      setNote(`Không chép được, hãy gửi liên kết này: ${shareLink}`);
    }
  };

  const question = QUESTIONS[answers.length];

  return (
    <main id="main-content" className="lc-root" style={root ? ({ "--lc-tint": root.tint } as React.CSSProperties) : undefined}>
      <div className="lc-column">
        {!started && (
          <section className="lc-panel">
            <p className="lc-eyebrow">Cẩu Đạo Tông · Tuyển đệ tử</p>
            <h1 className="lc-title">Test Linh Căn</h1>
            {friend ? (
              <p className="lc-friend">
                Đồng môn của bạn là <b style={{ color: friend.tint }}>{friend.name} {friend.school}</b>.<br />
                Bạn hợp tu hay là khắc tinh của họ?
              </p>
            ) : (
              <p className="lc-lead">Tám câu hỏi, một phút, biết ngay đạo hữu mang linh căn gì và ai là khắc tinh.</p>
            )}
            <button type="button" className="lc-cta" onClick={start}>Đo linh căn</button>
            <p className="lc-fine">Không cần đăng ký. Trò đùa cho vui, không phải bói toán.</p>
          </section>
        )}

        {started && question && (
          <section className="lc-panel" aria-live="polite">
            <div className="lc-progress" role="progressbar" aria-label="Tiến độ" aria-valuemin={0} aria-valuemax={QUESTIONS.length} aria-valuenow={answers.length + 1}>
              <span style={{ width: `${((answers.length + 1) / QUESTIONS.length) * 100}%` }} />
            </div>
            <p className="lc-eyebrow">Câu {answers.length + 1}/{QUESTIONS.length}</p>
            <h2 className="lc-question">{question.text}</h2>
            <div className="lc-options">
              {question.options.map((option, index) => (
                <button key={option.text} type="button" className="lc-option" onClick={() => setAnswers(current => [...current, index])}>
                  {option.text}
                </button>
              ))}
            </div>
          </section>
        )}

        {started && root && (
          <section className="lc-panel lc-result">
            <p className="lc-eyebrow">Linh căn của đạo hữu</p>
            <h1 className="lc-root-name">{root.name}</h1>
            <p className="lc-school">{root.school}</p>
            <p className="lc-verdict">{root.verdict}</p>
            <dl className="lc-facts">
              <div><dt>Thần thông</dt><dd>{root.skill}</dd></div>
              <div><dt>Tử huyệt</dt><dd>{root.weakness}</dd></div>
              <div><dt>Hợp tu với</dt><dd>{ROOTS[root.mate].name} {ROOTS[root.mate].school}</dd></div>
              <div><dt>Khắc tinh</dt><dd>{ROOTS[root.nemesis].name} {ROOTS[root.nemesis].school}</dd></div>
            </dl>
            <label className="lc-name">
              <span>Tên in lên thẻ</span>
              <input value={name} onChange={event => setName(event.target.value)} maxLength={24} placeholder="Đạo hữu vô danh" autoComplete="off" />
            </label>
            <div className="lc-actions">
              {canShareFiles && <button type="button" className="lc-cta" disabled={busy} onClick={() => void deliver("share")}>Khoe thẻ</button>}
              <button type="button" className={canShareFiles ? "lc-ghost" : "lc-cta"} disabled={busy} onClick={() => void deliver("save")}>Lưu thẻ ảnh</button>
              <button type="button" className="lc-ghost" onClick={() => void copyLink()}>Thách đồng môn</button>
            </div>
            {note && <p className="lc-note" role="status">{note}</p>}
            <a className="lc-room" href="/" onClick={() => track("linhcan_to_room", root.id)}>Vào tông môn ngồi thiền cùng mọi người →</a>
            <button type="button" className="lc-text" onClick={restart}>Đo lại</button>
          </section>
        )}
      </div>
    </main>
  );
}
