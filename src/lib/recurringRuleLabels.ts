import { parseIsoDateLocal } from "./formatDisplayDate";
import type { RecurrenceType } from "../types/recurring";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 一覧用の短い説明 */
export function recurrenceShortLabel(type: RecurrenceType, startDate: string): string {
  switch (type) {
    case "daily":
      return "毎日";
    case "weekly": {
      const wd = parseIsoDateLocal(startDate).getDay();
      return `毎週（${WEEKDAYS[wd]}）`;
    }
    case "monthly": {
      const dom = parseIsoDateLocal(startDate).getDate();
      return `毎月${dom}日`;
    }
    case "yearly": {
      const d = parseIsoDateLocal(startDate);
      return `毎年${d.getMonth() + 1}月${d.getDate()}日`;
    }
    default:
      return type;
  }
}

/** フォームのセレクト用ラベル */
export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; hint: string }[] = [
  { value: "daily", label: "毎日", hint: "開始日以降、カレンダー上は毎日" },
  { value: "weekly", label: "毎週", hint: "開始日と同じ曜日ごと" },
  { value: "monthly", label: "毎月", hint: "開始日と同じ日付（短い月は月末）" },
  { value: "yearly", label: "毎年", hint: "開始日と同じ月日" },
];
