# PWA（ホーム画面追加）ガイド

このアプリは [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) で **Web App Manifest** と **Service Worker（Workbox）** を生成します。

## オフラインでできること / オンライン必須のこと

| 状況 | 説明 |
|------|------|
| **オフライン（または不安定）** | ビルド済みの **HTML / JS / CSS / アイコン等の静的アセット** がキャッシュされていれば、**アプリの画面（シェル）は起動**し、ルーティングで各パスに遷移しても SPA として表示されます。 |
| **オンライン必須** | **Supabase への API**（ログイン・セッション・家計データの読み書き）、**初回の Service Worker 登録とキャッシュ取得**、**新しいバージョンの取得と更新チェック**。**認証前後のデータ同期はすべてネットワーク依存**です。オフライン時は UI は出てもログインや一覧取得は失敗します。 |

方針: **「シェルはキャッシュ、データは常にネットワーク」**。Supabase 向けリクエストは Workbox で `NetworkOnly` とし、古い API レスポンスを誤ってキャッシュしないようにしています。

## 開発時の確認方法

1. `npm run dev` を実行（`devOptions.enabled: true` のため開発時も SW が有効になります）。
2. **Microsoft Edge** で `http://localhost:5173` を開き、**開発者ツール（F12）→ アプリケーション** で以下を確認します。
   - **Manifest**: 名前・アイコン・ `display` など
   - **Service Workers**: 登録状態・スコープ
3. **更新の挙動**: コード変更後に再ビルド相当の挙動は開発時と本番で異なります。本番向けの最終確認は `npm run build` → `npm run preview` を推奨します。

注意: PWA や一部 Web API は **HTTPS**（本番 URL や `localhost`）前提のことがあります。

## 本番時の確認方法

1. `npm run build` で `dist/` を生成。
2. `npm run preview` でプレビューサーバを起動し、**Microsoft Edge** などで確認するか、**HTTPS でホスティングした URL**（Vercel / Netlify / Cloudflare Pages など）にデプロイして確認します。
3. Edge の **アプリケーション** パネルで Manifest / Service Worker を再確認します。
4. **iPhone Safari** で本番 URL を開き、**共有 → ホーム画面に追加** します。
5. ホーム画面のアイコンから起動し、**ステータスバー周り・全画面に近い表示（standalone）** になるか確認します。

---

## Vercel にデプロイする手順（本番 URL を作る）

iPhone の Safari から **HTTPS** で開くには、Vercel などにホストするのが手軽です。以下は **初心者向けの流れ**です。

### 事前準備

1. プロジェクトを **Git** で管理し、**GitHub** などにリポジトリとして公開できる状態にしておきます。
2. PC に Node.js が入っていれば、`household-pwa` フォルダで **`npm run build` が成功する**ことを一度確認しておくと安心です。

### 1. Supabase の値を控える

1. [Supabase](https://supabase.com) にログインし、対象プロジェクトを開きます。
2. 左メニュー **Project Settings（歯車）→ API** を開きます。
3. 次の 2 つをコピーしてメモします（後で Vercel に貼ります）。
   - **Project URL**（`https://xxxxxxxx.supabase.co` の形）
   - **anon public** キー（長い文字列。**service_role は使わない・公開しない**）

### 2. Vercel でプロジェクトを作成

1. [Vercel](https://vercel.com) にアカウントを作り、ログインします。
2. **Add New… → Project** で、GitHub の **この家計簿リポジトリ** を選び **Import** します。
3. **Framework Preset** が **Vite** になっていることを確認します（自動でそうなることが多いです）。
4. **Root Directory**: リポジトリの直下が `household-pwa` だけの場合は **`.`** のまま。モノレポでフォルダが一段深い場合は **`household-pwa`** を指定します。
5. ビルド設定の目安（通常はそのままでよいです）:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. **Environment Variables** を展開し、次を **1 行ずつ** 追加します（名前は **大文字・スペル固定**）。

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Supabase の **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Supabase の **anon public** キー |

7. 各変数で **Production / Preview / Development** にチェックが入るようにしておくと、プレビュー URL でも動かしやすいです。
8. **Deploy** を押して完了を待ちます。

> **重要**: `VITE_` で始まる変数は **ビルド時** にフロントに埋め込まれます。環境変数を後から追加・変更した場合は、Vercel の **Deployments** から **Redeploy** してください。

### 3. Supabase 側で「本番の URL」を許可する

デプロイが終わると `https://あなたのプロジェクト名.vercel.app` のような URL が表示されます（**Settings → Domains** でも確認できます）。

1. Supabase の **Authentication → URL Configuration** を開きます。
2. **Site URL** に、Vercel の本番 URL（例: `https://my-app.vercel.app`）を設定します。
3. **Redirect URLs** に、次のような形で追加します（複数行可）。
   - `https://my-app.vercel.app/**`
   - プレビュー用に `https://*.vercel.app/**` を入れると、プレビューデプロイでもログインしやすくなります（プロジェクト方針に合わせて調整）。
4. 保存します。

メール確認リンクなどを使う設定の場合は、メール内リンク先も本番 URL と一致させる必要があります。

### 4. 動作確認（PC）

1. Vercel の本番 URL を **Microsoft Edge** などで開き、**ログイン・登録・一覧** が使えるか確認します。
2. 問題があれば、Vercel の **Deployments → ログ** と、ブラウザの **開発者ツール → コンソール** でエラーを確認します。

### 5. iPhone で使う（PWA）

1. iPhone の **Safari** で、**同じ本番 HTTPS の URL** を開きます。
2. 共有ボタンから **ホーム画面に追加** します。
3. ホーム画面のアイコンから起動して使います。

詳細はこのドキュメントの「本番時の確認方法」「ホーム画面追加時の挙動」「iOS Safari の注意点」を参照してください。

### ルーティングについて

リポジトリ直下の **`vercel.json`** で、存在しないパスは `index.html` に回す設定をしています。`/login` や `/transactions/new` を直接開いても 404 になりにくくなります。

---

## PWA.md だけ読めば iPhone で家計簿を使えるか？

- **PWA としての挙動**（ホーム画面追加・オフラインの範囲・iOS の注意・アイコン）は、この `PWA.md` にまとまっています。
- **実際に iPhone からアクセスするには**、上記のとおり **Vercel などにデプロイした HTTPS の URL** と、**Supabase の URL 設定・環境変数** が揃っている必要があります。これらはアプリのコードだけでは完結しません。
- まとめると: **デプロイと Supabase 設定まで終えたうえで**、この `PWA.md` の iPhone / PWA の章に従えば、ホーム画面から使える状態にできます。

## ホーム画面追加時の挙動（想定）

- **Android（Edge / Chrome など）**: ブラウザのメニューから「アプリをインストール」等で追加。manifest の `display: standalone` に沿った表示になりやすいです。
- **iOS（Safari）**: 「ホーム画面に追加」したアイコン起動は **スタンドアロン風の表示** になりますが、**エンジンは Safari（WebKit）** のままです。詳細は下記「iOS の制約」を参照してください。

## アプリアイコンの設定方法

### 現状

- `public/pwa-icon.svg` を **favicon / manifest / 一部の apple-touch-icon** として利用しています。
- **Edge / Chrome など Chromium 系のインストール** や **Android** では SVG アイコンが使われることがあります。

### iOS で見た目を確実にしたい場合（推奨）

Apple は従来 **`apple-touch-icon` に PNG（例: 180×180）** を用意する方法が安定です。

1. デザインツールや [Maskable.app](https://maskable.app/editor) などで **192×192 以上（推奨 512×512）** の PNG を用意し、**マスク安全領域**にロゴが収まるようにします。
2. **`public/apple-touch-icon.png`（180×180）** をエクスポートして配置します。
3. `index.html` の `apple-touch-icon` の `href` を `/apple-touch-icon.png` に変更します。
4. 同じ画像（または 192 / 512）を `public/` に置き、`vite.config.ts` の `manifest.icons` に **PNG のエントリを追加**すると、インストール時の見た目がより安定します。

**参考**: [RealFaviconGenerator](https://realfavicongenerator.net/) で複数サイズを一括生成できます。

## iOS Safari（ホーム画面 PWA）の注意点

- **プッシュ通知**: iOS の Web Push は環境・バージョンにより制限が大きく、ネイティブアプリと同等とは限りません（本アプリは未使用でも、制約として把握しておくとよいです）。
- **バックグラウンド**: バックグラウンドでの処理や同期はネイティブより限定的です。
- **ストレージ**: 長期間未使用でサイトデータが消えると、キャッシュやローカル状態もリセットされることがあります。
- **Service Worker**: 対応は進んでいますが、**デスクトップ Edge（や他ブラウザ）と挙動が完全一致しない**場合があります。重要な動作は実機で確認してください。
- **カメラ・マイク・一部 API**: **HTTPS**（または `localhost`）が必要です。ホーム画面追加後も同様です。
- **リンクの開き方**: 外部リンクが **アプリ内か Safari か** は OS / 設定により異なります。
- **manifest の `theme-color`**: iOS では期待どおりに反映されない場合があります。`index.html` の `theme-color` と `apple-mobile-web-app-status-bar-style` で補完しています。

## テーマ色について

- **`index.html` の `theme-color`**: ライト `#f4f7f6` / ダーク `#0c0f0e`（画面背景に近い色で、ブラウザ UI とのなじみ用）。
- **`manifest` の `theme_color`**: ブランド色 `#0f766e`（インストール時スプラッシュ等で使われることがあります）。

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `vite.config.ts` | `VitePWA`（manifest 内容、Workbox の precache / runtimeCaching） |
| `index.html` | PWA 向け meta、`apple-touch-icon` |
| `src/main.tsx` | `virtual:pwa-register` による SW 登録・定期更新チェック |
| `public/pwa-icon.svg` | 既定アイコン（SVG） |
| `vercel.json` | Vercel 上での SPA 用リライト（任意だが推奨） |
| `docs/PWA.md` | 本ドキュメント |
| `docs/FUTURE_RECEIPT_INPUT.md` | 将来のレシート OCR 等のメモ（未実装） |
