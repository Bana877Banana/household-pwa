import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";
import { parseQrTransaction, type QrPrefill } from "../lib/parseQrTransaction";

const READER_ELEMENT_ID = "household-qr-reader";

type Phase = "intro" | "scanning" | "result" | "perm_denied" | "camera_error";

export function QrScanPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("intro");
  const [parsed, setParsed] = useState<QrPrefill | null>(null);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      await s.stop();
    } catch {
      /* already stopped */
    }
    try {
      await s.clear();
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (phase !== "scanning") return;

    const qr = new Html5Qrcode(READER_ELEMENT_ID, { verbose: false });
    scannerRef.current = qr;

    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1 },
      async (decodedText) => {
        await stopScanner();
        setParsed(parseQrTransaction(decodedText));
        setPhase("result");
      },
      () => {},
    ).catch((err: Error & { name?: string }) => {
      void stopScanner();
      const name = err?.name ?? "";
      const msg = String(err?.message ?? err);
      if (name === "NotAllowedError" || /permission|denied/i.test(msg)) {
        setPhase("perm_denied");
      } else {
        setPhase("camera_error");
      }
      setCameraMessage(msg || "カメラを開始できませんでした。");
    });

    return () => {
      void stopScanner();
    };
  }, [phase, stopScanner]);

  const startScanning = useCallback(() => {
    setCameraMessage(null);
    setParsed(null);
    setPhase("scanning");
  }, []);

  const goToNewTransaction = useCallback(() => {
    if (!parsed) return;
    navigate("/transactions/new", { state: { qrPrefill: parsed } });
  }, [navigate, parsed]);

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

  const isSecure =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");

  return (
    <div className="screen form-screen qr-scan-screen">
      <header className="form-screen__head">
        <Link to="/" className="form-back">
          ← ホーム
        </Link>
        <h1 className="form-screen__title">QRコード読取</h1>
        <p className="form-screen__sub muted small">{household.name}</p>
      </header>

      <div className="form-screen__body qr-scan__body">
        {!isSecure ? (
          <div className="card qr-scan__notice" role="alert">
            <p className="error">カメラ利用には HTTPS（または localhost）が必要です。</p>
            <p className="muted small">本番URLは https:// で開いてください。</p>
          </div>
        ) : null}

        {phase === "intro" ? (
          <div className="card qr-scan__notice">
            <p className="label">カメラの許可</p>
            <p className="muted small qr-scan__copy">
              「カメラを開始」を押すと、ブラウザからカメラの使用が求められます。
              <strong>許可</strong>を選ぶと背面カメラでQRを読み取ります。
            </p>
            <p className="muted small qr-scan__copy">
              <strong>iPhone（Safari）</strong>
              ：初回はアドレスバー付近の許可、または設定アプリから Safari →
              カメラ／このサイトの権限を確認してください。PWAでホーム画面追加した場合も同様です。
            </p>
            <button type="button" className="btn primary qr-scan__start" onClick={startScanning}>
              カメラを開始
            </button>
          </div>
        ) : null}

        {phase === "perm_denied" ? (
          <div className="card qr-scan__notice" role="alert">
            <p className="error">カメラが許可されていません。</p>
            <p className="muted small">
              OSの設定でこのサイト（または Safari）のカメラをオンにし、画面を更新してから再度お試しください。
            </p>
            <button type="button" className="btn primary qr-scan__start" onClick={startScanning}>
              もう一度試す
            </button>
          </div>
        ) : null}

        {phase === "camera_error" ? (
          <div className="card qr-scan__notice" role="alert">
            <p className="error">カメラを起動できませんでした。</p>
            {cameraMessage ? (
              <p className="muted small" role="status">
                {cameraMessage}
              </p>
            ) : null}
            <button type="button" className="btn secondary qr-scan__start" onClick={() => setPhase("intro")}>
              戻る
            </button>
          </div>
        ) : null}

        {phase === "scanning" ? (
          <div className="card qr-scan__viewport-wrap">
            <p className="muted small qr-scan__hint">QRを枠内に合わせてください</p>
            <div id={READER_ELEMENT_ID} className="qr-scan__viewport" />
            <button
              type="button"
              className="btn secondary qr-scan__cancel"
              onClick={() => {
                void stopScanner();
                setPhase("intro");
              }}
            >
              キャンセル
            </button>
          </div>
        ) : null}

        {phase === "result" && parsed ? (
          <div className="card qr-scan__result">
            <p className="label">読み取った文字列</p>
            <pre className="qr-scan__raw" tabIndex={0}>
              {parsed.raw}
            </pre>

            <p className="label">推定（未入力はフォームで補完）</p>
            <ul className="qr-scan__extract muted small">
              <li>金額: {parsed.amountRaw ?? "—"}</li>
              <li>日付: {parsed.occurredOn ?? "—"}</li>
              <li>メモ（店名など）: {parsed.memo ?? "—"}</li>
            </ul>

            <div className="qr-scan__actions">
              <button type="button" className="btn primary qr-scan__action-btn" onClick={goToNewTransaction}>
                収支登録へ進む
              </button>
              <button type="button" className="btn secondary qr-scan__action-btn" onClick={startScanning}>
                再スキャン
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
