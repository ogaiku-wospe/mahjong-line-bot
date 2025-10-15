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

### 3. 統計表示
- **テキスト形式**: シンプルな個人統計
- **グラフ画像形式**: 累積スコア推移と順位分布のビジュアル表示 📊
  - スコア推移グラフ（折れ線グラフ）
  - 順位分布グラフ（棒グラフ）
  - 総合成績、点数統計の詳細表示

### 4. プレイヤー管理
- プレイヤー登録
- LINE連携
- 統計表示

### 5. シーズン管理
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

# 画像解析（雀魂のスクリーンショットから自動記録）📸
@麻雀点数管理bot 画像解析
@麻雀点数管理bot img
# ↑のコマンドを送った後、60秒以内に画像を送信

# ランキング（テキスト）
@麻雀点数管理bot ランキング
@麻雀点数管理bot rank

# ランキング（画像）
@麻雀点数管理bot ランキング画像
@麻雀点数管理bot ri

# 取り消し
@麻雀点数管理bot 取消
@麻雀点数管理bot u

# 統計（テキスト）
@麻雀点数管理bot 統計 [プレイヤー名]
@麻雀点数管理bot st [プレイヤー名]

# 統計（グラフ画像）
@麻雀点数管理bot 統計画像 [プレイヤー名]
@麻雀点数管理bot stimg [プレイヤー名]

# 質問（AI機能）
@麻雀点数管理bot シーズンを切り替えたい
@麻雀点数管理bot ランキングを画像で見たい
# コマンドがわからない時は普通に質問してください
```

### 画像解析の使い方（詳細）

1. **画像解析モードを起動**
   ```
   @麻雀点数管理bot 画像解析
   ```
   または
   ```
   @麻雀点数管理bot img
   ```

2. **ボットからの返答を確認**
   - 「■ 画像解析モード」というメッセージが返ってきます
   - 60秒以内に画像を送信する必要があります

3. **雀魂のスクリーンショットを送信**
   - 対戦結果画面のスクリーンショットを送信
   - プレイヤー名と点数が自動的に抽出されます

4. **解析結果を確認**
   - 「📸 画像を受信しました」のメッセージが表示されます
   - 5-10秒後に解析結果が表示されます
   - 「この内容で記録」ボタンをタップして記録完了！

## 🎨 画像生成機能の特徴

### ランキング画像
- **季節テーマ**: 春夏秋冬で自動的に色が変わる
- **メダル表示**: 1位〜3位にゴールド・シルバー・ブロンズメダル
- **詳細統計**: 総合ポイント、1位率、平均順位を表示
- **スマホ対応**: PNG形式でスマホLINEでも正常に表示

### 統計グラフ画像 (NEW! 📊)
- **累積スコア推移**: 対戦ごとのスコア変化を折れ線グラフで可視化
- **順位分布**: 1位〜4位の回数を棒グラフで表示（パーセンテージ付き）
- **詳細統計カード**: 
  - 総合成績（対戦数、合計スコア、平均スコア、平均順位）
  - 順位分布（各順位の回数と割合）
  - 点数統計（最高点棒、最低点棒、平均点棒）
- **高品質デザイン**: Chart.jsによる美しいグラフ描画
- **スマホ対応**: 1200x1400pxの高解像度PNG画像

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
- **2025-10-15 15:00**: 画像解析機能修正（lastMentionTime設定追加）
- **2025-10-15 15:30**: 画像解析デバッグログ追加、画像受信確認メッセージ追加 📸
- **2025-10-15 16:30**: タイムゾーン問題修正（UTC → JST変換実装）
- **2025-10-15 17:00**: 統計グラフ画像生成機能追加
  - Chart.jsによる累積スコア推移グラフ
  - 順位分布の棒グラフ
  - 詳細統計カード表示
  - PNG画像として送信
- **2025-10-15 18:00**: コマンド体系改善
  - 統計コマンドをテキスト版(st)と画像版(stimg)に分離
  - ヘルプの簡素化
  - ユーザーが用途に応じて選択可能に
- **2025-10-15 18:30**: AI質問応答機能追加
  - 「シーズンを切り替えたい」などの自然な質問に対応
  - コマンドリファレンスをAIが参照して適切な回答を生成
  - 質問パターン自動検出（したい、方法、どうやって等）
  - コマンドが分からない時はAIに質問できる
- **2025-10-16 01:30**: AI推測コマンド実行バグ修正
  - AI推測記録コマンド（r [名前] [点数]）が「実行中...」表示後に実行されない問題を修正
  - executeCommand関数に記録コマンドハンドラーを追加
  - バックグラウンド実行時はpushMessageを使用
  - 点数検証とエラーハンドリングを実装

## 📄 ライセンス

Private Project

## 👤 作成者

ogaiku@utd-tec.com

---

**Note**: このボットは完全にCloudflare Workers上で動作し、サーバーレスでスケーラブルな設計となっています。
