import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { prepareImageForReceiptOcr } from "../lib/receiptImagePrep";
import { runReceiptOcr } from "../lib/receiptOcr";
import {
  extractDateCandidates,
  extractMerchantHint,
  extractTotalCandidates,
  type TotalAmountCandidate,
} from "../lib/receiptParse";
import type { TransactionFormPrefill } from "../types/transactionFormPrefill";

function buildMemoFromOcr(merchantHint?: string): string {
  const lines = ["【OCR読取】"];
  if (merchantHint) lines.push(merchantHint);
  return lines.join("\n");
}

export function ReceiptScanPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);

  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrAttemptDone, setOcrAttemptDone] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>("");
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");

  const [candidates, setCandidates] = useState<TotalAmountCandidate[]>([]);
  const [amountRaw, setAmountRaw] = useState("");
  const [dateIso, setDateIso] = useState<string | undefined>(undefined);
  const [merchantHint, setMerchantHint] = useState<string | undefined>(undefined);
  const [dateOptions, setDateOptions] = useState<{ iso: string; label: string }[]>([]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetFlow = useCallback(() => {
    setOcrError(null);
    setOcrAttemptDone(false);
    setOcrText("");
    setCandidates([]);
    setAmountRaw("");
    setDateIso(undefined);
    setMerchantHint(undefined);
    setDateOptions([]);
    setOcrProgress("");
  }, []);

  const onPickedFile = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) {
        setOcrError("画像ファイルを選んでください。");
        return;
      }
      resetFlow();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSourceBlob(file);
      setOcrError(null);
    },
    [previewUrl, resetFlow]
  );

  const runOcr = useCallback(async () => {
    if (!sourceBlob) return;
    setOcrBusy(true);
    setOcrError(null);
    setOcrProgress("画像を準備しています…");
    try {
      const prepared = await prepareImageForReceiptOcr(sourceBlob);
      setOcrProgress("");
      const { text } = await runReceiptOcr(prepared, (p) => {
        setOcrProgress(p.percent != null ? `${p.status}（${p.percent}%）` : p.status);
      });
      setOcrText(text);
      const totals = extractTotalCandidates(text);
      setCandidates(totals);
      setMerchantHint(extractMerchantHint(text));
      setDateOptions(extractDateCandidates(text));
      if (totals.length > 0) {
        setAmountRaw(String(totals[0].yen));
      } else {
        setAmountRaw("");
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "文字の読み取りに失敗しました。通信環境を確認して、もう一度お試しください。";
      setOcrError(msg);
      setOcrText("");
      setCandidates([]);
    } finally {
      setOcrAttemptDone(true);
      setOcrBusy(false);
      setOcrProgress("");
    }
  }, [sourceBlob]);

  const goToTransactionForm = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = amountRaw.trim();
      if (!trimmed) return;

      const prefill: TransactionFormPrefill = {
        source: "ocr",
        amountRaw: trimmed,
        memo: buildMemoFromOcr(merchantHint),
        rawText: ocrText || undefined,
        occurredOn: dateIso,
      };

      navigate("/transactions/new", { state: { transactionFormPrefill: prefill } });
    },
    [amountRaw, dateIso, merchantHint, navigate, ocrText]
  );

  if (authLoading || householdLoading) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!household) {
    return <Navigate to="/household/setup" replace />;
  }

  return (
    <div className="screen form-screen receipt-scan-screen">
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">レシート読取</h1>
        <p className="form-screen__sub muted small">{household.name}</p>
      </header>

      <div className="receipt-scan__notice card" role="note">
        <p className="receipt-scan__notice-title">ご利用前に</p>
        <p className="muted small receipt-scan__notice-body">
          OCRは完全ではありません。金額・日付は必ず目で確認してから登録してください。カテゴリや種別は次の画面で選べます。
        </p>
      </div>

      <section className="card receipt-scan__pick">
        <p className="label">画像の取得</p>
        <div className="receipt-scan__pick-row">
          <button
            type="button"
            className="btn primary receipt-scan__pick-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
            カメラで撮影
          </button>
          <button
            type="button"
            className="btn secondary receipt-scan__pick-btn"
            onClick={() => libraryInputRef.current?.click()}
          >
            写真を選ぶ
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          onChange={(ev) => {
            const f = ev.target.files?.[0] ?? null;
            onPickedFile(f);
            ev.target.value = "";
          }}
        />
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(ev) => {
            const f = ev.target.files?.[0] ?? null;
            onPickedFile(f);
            ev.target.value = "";
          }}
        />
        <p className="muted small receipt-scan__hint">
          iPhoneのブラウザでは、権限の許可や「ファイルの選択」画面の表示に時間がかかることがあります。
        </p>
      </section>

      {previewUrl ? (
        <section className="card receipt-scan__preview-block">
          <p className="label">プレビュー</p>
          <div className="receipt-scan__preview">
            <img src={previewUrl} alt="選択したレシート" className="receipt-scan__preview-img" />
          </div>
          <button
            type="button"
            className="btn primary receipt-scan__ocr-btn"
            disabled={ocrBusy || !sourceBlob}
            onClick={() => void runOcr()}
          >
            {ocrBusy ? "読み取り中…" : "この画像で文字を読み取る"}
          </button>
          {ocrBusy ? (
            <div className="receipt-scan__loading" aria-live="polite">
              <p className="muted small">{ocrProgress || "処理しています…"}</p>
              <p className="muted small">
                初回は言語データの取得で数十秒かかることがあります（オンライン推奨）。
              </p>
            </div>
          ) : null}
          {ocrError ? (
            <p className="error receipt-scan__err" role="alert">
              {ocrError}
            </p>
          ) : null}
        </section>
      ) : null}

      {sourceBlob && ocrAttemptDone ? (
        <form className="card receipt-scan__form" onSubmit={goToTransactionForm}>
          <p className="label">合計金額</p>
          <p className="muted small receipt-scan__field-hint">
            候補をタップするか、下の欄に直接入力してください。
          </p>
          {candidates.length > 0 ? (
            <ul className="receipt-scan__candidates" aria-label="金額の候補">
              {candidates.map((c, idx) => (
                <li key={`${c.yen}-${idx}`}>
                  <button
                    type="button"
                    className={`receipt-scan__candidate ${amountRaw === String(c.yen) ? "receipt-scan__candidate--active" : ""}`}
                    onClick={() => setAmountRaw(String(c.yen))}
                  >
                    <span className="receipt-scan__candidate-yen">
                      {c.yen.toLocaleString("ja-JP")}円
                    </span>
                    <span className="receipt-scan__candidate-reason muted small">{c.reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : ocrText ? (
            <p className="muted small">
              合計らしきキーワードから金額を特定できませんでした。右記の読み取り結果を参考に、金額を手入力してください。
            </p>
          ) : null}

          <label className="field receipt-scan__amount-field">
            <span className="label">金額（確認・修正）</span>
            <input
              type="text"
              name="amount_confirm"
              inputMode="decimal"
              autoComplete="off"
              placeholder="例: 1280"
              value={amountRaw}
              onChange={(ev) => setAmountRaw(ev.target.value)}
              className="receipt-scan__amount-input"
            />
          </label>

          {merchantHint ? (
            <div className="receipt-scan__hint-block">
              <p className="label">店名っぽい行（参考）</p>
              <p className="receipt-scan__merchant muted small">{merchantHint}</p>
            </div>
          ) : null}

          {dateOptions.length > 0 ? (
            <div className="receipt-scan__hint-block">
              <p className="label">日付の候補（任意）</p>
              <div className="receipt-scan__date-chips" role="group" aria-label="日付候補">
                {dateOptions.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    className={`btn secondary receipt-scan__chip ${dateIso === d.iso ? "receipt-scan__chip--active" : ""}`}
                    onClick={() => setDateIso((cur) => (cur === d.iso ? undefined : d.iso))}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="muted small">もう一度タップで解除できます。未選択の場合は登録画面の今日の日付が使われます。</p>
            </div>
          ) : null}

          {ocrText ? (
            <details className="receipt-scan__details">
              <summary>OCRで読み取った全文（参考）</summary>
              <pre className="receipt-scan__ocr-pre">{ocrText}</pre>
            </details>
          ) : null}

          <button
            type="submit"
            className="btn primary receipt-scan__submit"
            disabled={!amountRaw.trim()}
          >
            この金額で収支登録へ
          </button>
        </form>
      ) : null}

      <p className="muted small receipt-scan__footer-note">
        画像は端末内でのみ処理し、サーバーに保存しません。
      </p>
    </div>
  );
}
