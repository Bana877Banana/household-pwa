/**
 * レシート写真は解像度が高く、ブラウザOCRでは遅延・メモリ圧迫の原因になりやすい。
 * 長辺を上限に縮小してから OCR に渡す（画質は OCR に十分な範囲で維持）。
 */
const DEFAULT_MAX_EDGE = 1680;
const JPEG_QUALITY = 0.88;

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = url;
  });
}

export async function prepareImageForReceiptOcr(
  input: Blob,
  maxEdge: number = DEFAULT_MAX_EDGE
): Promise<Blob> {
  const img = await loadImage(input);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) {
    throw new Error("画像のサイズを取得できませんでした");
  }

  const longest = Math.max(w, h);
  if (longest <= maxEdge) {
    return input;
  }

  const scale = maxEdge / longest;
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("画像の処理に失敗しました");
  }
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) {
    throw new Error("画像の変換に失敗しました");
  }
  return blob;
}
