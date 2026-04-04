import type { Worker } from "tesseract.js";

/**
 * クライアント側 OCR の戻り値。
 * 将来サーバーOCRや外部APIに差し替える場合も、この形を維持しやすい。
 */
export type ReceiptOcrResult = {
  text: string;
};

export type ReceiptOcrProgress = {
  status: string;
  /** 0–100 相当（利用可能なときのみ） */
  percent?: number;
};

/**
 * 画像からテキストを抽出する（既定: Tesseract.js + 日本語・英語）。
 * 別実装に差し替える場合はこの関数を置き換えるか、ラッパー経由で呼び出す。
 *
 * tesseract.js は動的 import し、レシート画面を開くまでメインのバンドルを肥大化させない。
 */
export async function runReceiptOcr(
  image: Blob,
  onProgress?: (p: ReceiptOcrProgress) => void
): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  let worker: Worker | undefined;
  try {
    onProgress?.({ status: "OCRエンジンを準備しています…" });
    worker = await createWorker("jpn+eng", 1, {
      logger: (ev) => {
        if (ev.status === "loading tesseract core") {
          onProgress?.({ status: "OCRを読み込み中…（初回は数秒かかることがあります）" });
        } else if (ev.status === "loading language traineddata") {
          onProgress?.({ status: "言語データを読み込み中…" });
        } else if (ev.status === "initializing tesseract") {
          onProgress?.({ status: "OCRを初期化しています…" });
        } else if (ev.status === "recognizing text") {
          const pct =
            typeof ev.progress === "number" ? Math.min(100, Math.round(ev.progress * 100)) : undefined;
          onProgress?.({ status: "文字を認識しています…", percent: pct });
        }
      },
    });

    const { data } = await worker.recognize(image);
    return { text: (data.text ?? "").trim() };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
