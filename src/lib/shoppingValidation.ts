export function validateShoppingItemName(
  raw: string
): { ok: true; name: string } | { ok: false; message: string } {
  const name = raw.trim();
  if (name.length === 0) {
    return { ok: false, message: "買いたいものを入力してください" };
  }
  if (name.length > 120) {
    return { ok: false, message: "名前は120文字以内にしてください" };
  }
  return { ok: true, name };
}

export function validateShoppingItemNote(
  raw: string
): { ok: true; note: string } | { ok: false; message: string } {
  const note = raw.trim();
  if (note.length > 200) {
    return { ok: false, message: "メモは200文字以内にしてください" };
  }
  return { ok: true, note };
}
