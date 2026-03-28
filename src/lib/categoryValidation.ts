export function validateCategoryName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = raw.trim();
  if (name.length === 0) {
    return { ok: false, message: "名前を入力してください" };
  }
  if (name.length > 80) {
    return { ok: false, message: "名前は80文字以内にしてください" };
  }
  return { ok: true, name };
}
