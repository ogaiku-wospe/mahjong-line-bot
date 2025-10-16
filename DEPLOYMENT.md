# デプロイ手順

## 🚀 Cloudflare Workersへのデプロイ

### 前提条件
- Cloudflareアカウント
- npmがインストール済み
- このリポジトリをクローン済み

### ステップ1: Wranglerにログイン

```bash
cd /home/user/webapp
npx wrangler login
```

ブラウザが開き、Cloudflareへのログインが求められます。認証を完了してください。

### ステップ2: デプロイ実行

```bash
npx wrangler deploy
```

### ステップ3: デプロイ確認

```bash
# デプロイされたWorkerの情報を確認
npx wrangler deployments list

# リアルタイムログを確認
npx wrangler tail --format pretty
```

## 📝 環境変数（シークレット）の設定

初回デプロイ時、または環境変数を更新する場合は以下のコマンドを実行してください：

```bash
# LINE API
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET

# Google Sheets API
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put RECORDS_SHEET_ID
npx wrangler secret put CONFIG_SHEET_ID

# AI Services
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put VISION_API_KEY

# Image Conversion (PNG生成用)
npx wrangler secret put HCTI_API_USER_ID
npx wrangler secret put HCTI_API_KEY
```

### 設定済みシークレットの確認

```bash
npx wrangler secret list
```

## 🔄 今回の修正内容

### 修正1: 統計コマンドのエラー修正
- **問題**: `st ogaiku` 実行時に `Cannot read properties of undefined (reading 'toFixed')` エラー
- **原因**: プロパティ名の不一致
- **修正**: `totalGames`, `avgScore`, `avgRank`, `rankDist` を使用するように修正

### 修正2: AI推測コマンドの実行改善
- **問題**: 「らんく」などの推測コマンドが実行されない
- **原因**: AIの出力にマークダウン記法が含まれる、マルチライン出力、エラーハンドリング不足
- **修正**: 
  - AI出力のクリーニング処理追加
  - 最初の行のみ抽出
  - マッチしないコマンドのエラーハンドリング追加

## 📊 デプロイ後の確認

1. LINEボットにメンションして以下をテスト：
   ```
   @麻雀点数管理bot st [プレイヤー名]
   ```
   → 統計が正しく表示されることを確認

2. AI推測機能をテスト：
   ```
   @麻雀点数管理bot らんく
   ```
   → ランキングが表示されることを確認

## ⚠️ トラブルシューティング

### エラー: "In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN"

**解決方法**:
```bash
npx wrangler login
```
を実行して認証してください。

### デプロイは成功したがボットが動作しない

**確認事項**:
1. シークレットが正しく設定されているか確認
   ```bash
   npx wrangler secret list
   ```

2. ログを確認
   ```bash
   npx wrangler tail --format pretty
   ```

3. LINE Webhook URLが正しく設定されているか確認
   - https://mahjong-line-bot.ogaiku.workers.dev/webhook

## 📞 サポート

問題が発生した場合は、以下を確認してください：
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- プロジェクトのIssueページ
