/**
 * レシート写真は解像度が高く、ブラウザOCRでは遅延・メモリ圧迫の原因になりやすい。
 * 長辺を上限に縮小し、グレースケール・コントラスト・二値化などで文字を立ててから OCR に渡す。
 */
const DEFAULT_MAX_EDGE = 1680;
const MIN_SHORT_EDGE = 720;
const ABS_MAX_EDGE = 2000;

export type PreparedReceiptImage = {
  blob: Blob;
  width: number;
  height: number;
};

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Otsu 法で二値化しきい値を求める */
function otsuThreshold(hist: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const vb = wB * wF * (mB - mF) * (mB - mF);
    if (vb > maxVar) {
      maxVar = vb;
      threshold = t;
    }
  }
  return threshold;
}

/** グレースケール配列にシャープ化（3x3 Laplacian 風） */
function sharpenGray(gray: Float32Array, w: number, h: number): void {
  const copy = new Float32Array(gray);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v =
        5 * copy[i] -
        copy[i - 1] -
        copy[i + 1] -
        copy[i - w] -
        copy[i + w];
      gray[i] = clamp(v, 0, 255);
    }
  }
}

/**
 * Canvas 上の画像をグレースケール → コントラスト強調 → 軽いシャープ → Otsu 二値化。
 */
function preprocessCanvasToBinary(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const gray = new Float32Array(n);
  const hist = new Uint32Array(256);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const g = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
    gray[i] = g;
  }

  const contrast = 1.45;
  for (let i = 0; i < n; i++) {
    let g = 128 + (gray[i] - 128) * contrast;
    gray[i] = clamp(g, 0, 255);
  }

  sharpenGray(gray, w, h);

  hist.fill(0);
  for (let i = 0; i < n; i++) {
    hist[Math.round(gray[i])]++;
  }
  const thr = otsuThreshold(hist, n);

  for (let i = 0; i < n; i++) {
    const v = gray[i] > thr ? 255 : 0;
    const o = i * 4;
    d[o] = d[o + 1] = d[o + 2] = v;
    d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function computeTargetSize(nw: number, nh: number): { tw: number; th: number } {
  let tw = nw;
  let th = nh;
  const long = Math.max(tw, th);
  if (long > DEFAULT_MAX_EDGE) {
    const s = DEFAULT_MAX_EDGE / long;
    tw = Math.max(1, Math.round(tw * s));
    th = Math.max(1, Math.round(th * s));
  }
  const short = Math.min(tw, th);
  if (short < MIN_SHORT_EDGE) {
    const s = MIN_SHORT_EDGE / short;
    let nw2 = Math.round(tw * s);
    let nh2 = Math.round(th * s);
    const long2 = Math.max(nw2, nh2);
    if (long2 > ABS_MAX_EDGE) {
      const cap = ABS_MAX_EDGE / long2;
      nw2 = Math.max(1, Math.round(nw2 * cap));
      nh2 = Math.max(1, Math.round(nh2 * cap));
    }
    tw = nw2;
    th = nh2;
  }
  return { tw, th };
}

export async function prepareImageForReceiptOcr(input: Blob): Promise<PreparedReceiptImage> {
  const img = await loadImage(input);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) {
    throw new Error("画像のサイズを取得できませんでした");
  }

  const { tw, th } = computeTargetSize(nw, nh);

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("画像の処理に失敗しました");
  }
  ctx.drawImage(img, 0, 0, tw, th);
  preprocessCanvasToBinary(ctx, tw, th);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) {
    throw new Error("画像の変換に失敗しました");
  }
  return { blob, width: tw, height: th };
}
