import { isoDateFromLocal, parseIsoDateLocal } from "./formatDisplayDate";

/** QR 読取から収支登録へ渡す推定結果（未抽出は未設定のまま） */
export type QrPrefill = {
  raw: string;
  amountRaw?: string;
  memo?: string;
  occurredOn?: string;
};

function stripAmountDigits(s: string): string {
  return s.replace(/,/g, "").replace(/\s/g, "");
}

function normalizeYmd(y: string, mo: string, d: string): string {
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function isValidIsoLocal(iso: string): boolean {
  const t = parseIsoDateLocal(iso).getTime();
  return !Number.isNaN(t);
}

/** 文字列から最初に見つかった日付を YYYY-MM-DD に（ローカル暦解釈） */
export function extractDateFromString(s: string): string | undefined {
  const m1 = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    const iso = normalizeYmd(m1[1], m1[2], m1[3]);
    if (isValidIsoLocal(iso)) return iso;
  }

  const m2 = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m2) {
    const iso = normalizeYmd(m2[1], m2[2], m2[3]);
    if (isValidIsoLocal(iso)) return iso;
  }

  const trimmed = s.trim();
  if (/^\d{10}$/.test(trimmed)) {
    const d = new Date(Number(trimmed) * 1000);
    if (!Number.isNaN(d.getTime())) return isoDateFromLocal(d);
  }
  if (/^\d{13}$/.test(trimmed)) {
    const d = new Date(Number(trimmed));
    if (!Number.isNaN(d.getTime())) return isoDateFromLocal(d);
  }

  const isoHead = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (isoHead && isValidIsoLocal(isoHead[1])) return isoHead[1];

  return undefined;
}

function pickFirstAmountFromParams(sp: URLSearchParams): string | undefined {
  const keys = [
    "amount",
    "total",
    "price",
    "amt",
    "kingaku",
    "money",
    "value",
    "payAmount",
    "paymentAmount",
  ];
  for (const k of keys) {
    const v = sp.get(k);
    if (!v) continue;
    const n = stripAmountDigits(v);
    if (/^\d+(\.\d+)?$/.test(n)) {
      const intPart = n.split(".")[0];
      if (intPart.length > 0) return intPart;
    }
  }
  return undefined;
}

function pickStoreFromParams(sp: URLSearchParams): string | undefined {
  const keys = [
    "shop",
    "merchant",
    "store",
    "storeName",
    "name",
    "shopName",
    "mname",
    "brand",
    "title",
  ];
  for (const k of keys) {
    const v = sp.get(k);
    if (!v?.trim()) continue;
    try {
      return decodeURIComponent(v).trim().slice(0, 500);
    } catch {
      return v.trim().slice(0, 500);
    }
  }
  return undefined;
}

function pickDateFromParams(sp: URLSearchParams): string | undefined {
  const keys = ["date", "transactionDate", "payDate", "purchaseDate", "dt", "time"];
  for (const k of keys) {
    const v = sp.get(k);
    if (!v) continue;
    const iso = extractDateFromString(v);
    if (iso) return iso;
  }
  return undefined;
}

/**
 * レシート系URL・プレーンテキストから金額・店舗名・日付をヒューリスティックに推定。
 * 取れない項目は undefined（フォームで手入力）。
 */
export function parseQrTransaction(raw: string): QrPrefill {
  const trimmed = raw.trim();
  const out: QrPrefill = { raw: trimmed };

  try {
    const u = new URL(trimmed);
    const sp = u.searchParams;
    const fromParams = pickFirstAmountFromParams(sp);
    if (fromParams) out.amountRaw = fromParams;

    const store = pickStoreFromParams(sp);
    if (store) out.memo = store;

    const d = pickDateFromParams(sp);
    if (d) out.occurredOn = d;

    if (!out.memo) {
      const host = u.hostname.replace(/^www\./i, "");
      if (host && !/^(localhost|\d{1,3}(\.\d{1,3}){3})$/i.test(host)) {
        out.memo = host.slice(0, 200);
      }
    }
  } catch {
    /* 非URL */
  }

  if (!out.amountRaw) {
    const yen = trimmed.match(/[¥￥]\s*([\d,]+)/);
    if (yen) out.amountRaw = stripAmountDigits(yen[1]);
  }
  if (!out.amountRaw) {
    const jp = trimmed.match(
      /(?:合計|金額|お支払(?:い)?金額|支払(?:い)?金額|総額|決済金額)\s*[:：]?\s*[¥￥]?\s*([\d,]+)/,
    );
    if (jp) out.amountRaw = stripAmountDigits(jp[1]);
  }
  if (!out.amountRaw) {
    const en = trimmed.match(/\b(?:total|amount)\s*[:=]\s*[¥￥]?\s*([\d,]+)/i);
    if (en) out.amountRaw = stripAmountDigits(en[1]);
  }

  if (!out.occurredOn) {
    const d = extractDateFromString(trimmed);
    if (d) out.occurredOn = d;
  }

  if (!out.memo) {
    const shopLine = trimmed.match(/(?:店舗|ショップ|店名|お店|加盟店)\s*[:：]\s*(.+?)(?:\r?\n|$)/);
    if (shopLine) out.memo = shopLine[1].trim().slice(0, 200);
  }

  return out;
}
