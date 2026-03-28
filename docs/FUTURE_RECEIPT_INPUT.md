# 将来拡張: レシートからの入力（OCR）

## 方針（仕様メモ）

- **現状（MVP）**: 収支は**手入力**が主。QR 読取・OCR・画像保存は**実装していない**。
- **将来検討**: **レシート画像から金額・日付・店舗名を候補抽出**し、**ユーザーが確認・修正したうえで**収支登録へ反映する流れを追加できる余地がある。

## 拡張時のフック

| 箇所 | 役割 |
|------|------|
| `src/types/transactionFormPrefill.ts` の `TransactionFormPrefill` | `source: "ocr"` とフィールド候補を定義。登録画面は `location.state.transactionFormPrefill` を解釈可能。 |
| `TransactionNewPage` | 事前入力用 `useEffect` を `source === "ocr"` 等で分岐拡張。 |
| Supabase（任意） | Edge Function で外部 OCR API を呼ぶ、またはクライアントでテキスト化してから保存する、など。 |

画像ストレージ・OCR ライブラリ・具体的 API は、要件確定後に別途設計する。
