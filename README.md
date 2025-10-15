# mahjong-line-bot

麻雀点数管理LINE Bot - Cloudflare Workers版

## 📋 プロジェクト概要

LINE上で麻雀の点数を管理できるボットです。画像解析による自動記録、ランキング表示（PNG画像）、プレイヤー管理などの機能を提供します。

## ✨ 主な機能

### 1. 対戦記録管理
- **手動記録**: テキスト入力で対戦結果を記録
- **メンション記録**: @ユーザー指定で簡単記録
- **画像解析**: 雀魂のスクリーンショットから自動記録

### 2. ランキング表示
- **テキスト形式**: シンプルなテキストランキング
- **PNG画像形式**: スマホ対応の美しいランキング画像 🎨

### 3. プレイヤー管理
- プレイヤー登録
- LINE連携
- 統計表示

### 4. シーズン管理
- シーズン作成
- シーズン切り替え
- シーズン一覧

## 🚀 デプロイ情報

- **Platform**: Cloudflare Workers
- **Worker Name**: `mahjong-line-bot`
- **Production URL**: https://mahjong-line-bot.ogaiku.workers.dev
- **Status**: ✅ Active

## 🔧 技術スタック

- **Runtime**: Cloudflare Workers (Edge Computing)
- **Storage**: Cloudflare KV (Key-Value Storage)
- **Image Generation**: htmlcsstoimage.com API
- **Data Storage**: Google Sheets API
- **AI Services**: Google Gemini, Vision API
- **Messaging**: LINE Messaging API

## 📁 プロジェクト構成

```
mahjong-line-bot/
├── worker.js              # デプロイ済みのバンドルコード
├── wrangler.jsonc         # Cloudflare設定
├── .gitignore            # Git除外設定
└── README.md             # このファイル
```

## 🛠️ セットアップ

### 必要な環境変数

以下の環境変数を設定してください（`wrangler secret put`コマンドを使用）：

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

### デプロイ

```bash
# デプロイ
npx wrangler deploy

# ログ確認
npx wrangler tail --format pretty

# シークレット一覧
npx wrangler secret list
```

## 📝 使い方

### 基本コマンド

```
# ヘルプ
@麻雀点数管理bot ヘルプ
@麻雀点数管理bot h

# 記録
@麻雀点数管理bot 記録 [名前1] [点数1] [名前2] [点数2] ...
@麻雀点数管理bot r [名前1] [点数1] [名前2] [点数2] ...

# ランキング（テキスト）
@麻雀点数管理bot ランキング
@麻雀点数管理bot rank

# ランキング（画像）
@麻雀点数管理bot ランキング画像
@麻雀点数管理bot ri

# 取り消し
@麻雀点数管理bot 取消
@麻雀点数管理bot u

# 統計
@麻雀点数管理bot 統計 [プレイヤー名]
@麻雀点数管理bot s [プレイヤー名]
```

## 🎨 ランキング画像の特徴

- **季節テーマ**: 春夏秋冬で自動的に色が変わる
- **メダル表示**: 1位〜3位にゴールド・シルバー・ブロンズメダル
- **詳細統計**: 総合ポイント、1位率、平均順位を表示
- **スマホ対応**: PNG形式でスマホLINEでも正常に表示

## 🔍 トラブルシューティング

### 画像が表示されない場合

1. **環境変数の確認**
   ```bash
   npx wrangler secret list
   ```
   `HCTI_API_USER_ID`と`HCTI_API_KEY`が設定されていることを確認

2. **ログの確認**
   ```bash
   npx wrangler tail --format pretty
   ```
   エラーログを確認

3. **KVバインディングの確認**
   `wrangler.jsonc`で`kv_namespaces`が設定されていることを確認

## 📊 開発履歴

- **2025-10-14**: プロジェクト開始、基本機能実装
- **2025-10-15 09:00**: PNG変換機能追加
- **2025-10-15 13:00**: スマホ表示問題発見
- **2025-10-15 13:36**: 環境変数アクセス修正
- **2025-10-15 14:00**: スタックオーバーフロー問題修正
- **2025-10-15 14:30**: レイアウト・位置ずれ修正 ✅

## 📄 ライセンス

Private Project

## 👤 作成者

ogaiku@utd-tec.com

---

**Note**: このボットは完全にCloudflare Workers上で動作し、サーバーレスでスケーラブルな設計となっています。
