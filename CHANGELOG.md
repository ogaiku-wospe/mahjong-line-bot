# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-16

### Added
- 麻雀対戦記録管理機能
  - 手動入力による記録
  - メンション入力による記録
  - 雀魂スクリーンショット画像解析による記録
- ランキング表示機能
  - テキスト形式での表示
  - 画像形式での表示
- 統計表示機能
  - テキスト形式での統計
  - 画像形式での統計（グラフ付き）
- シーズン管理機能
  - シーズン作成
  - シーズン切替
  - シーズン一覧表示
- プレイヤー管理機能
  - プレイヤー登録
  - プレイヤー一覧表示
- AI予測コマンド実行機能（Gemini API使用）
- 記録の取り消し機能
- ヘルプコマンド

### Fixed
- 統計コマンドで`Cannot read properties of undefined (reading 'toFixed')`エラーが発生する問題を修正
  - プロパティ名の不一致（`gamesPlayed` → `totalGames`等）を修正
- AI予測コマンドが「実行中...」で止まる問題を修正
  - `isPush`パラメータを`false`から`true`に変更
  - AIの出力をクリーニング（コードブロックの削除）
- ヘルプテキストの構造を改善
  - 省略形コマンドを優先表示
  - 重複していた「よく使うコマンド」セクションを削除
  - 「（省略形）」表記と絵文字ヒントを削除
- エラーメッセージのbot名を統一
  - すべて「@麻雀点数管理bot」に統一
- エラーメッセージがユーザーの入力形式に合わせて表示されるように改善
- 統計画像生成が途中で止まる問題を修正
  - バックグラウンド処理化（`ctx.waitUntil()`使用）
  - HCTI API呼び出しに25秒のタイムアウト追加
  - 全体的な処理に30秒のタイムアウト追加

### Technical Details
- **Platform**: Cloudflare Workers
- **APIs Used**:
  - LINE Messaging API
  - Google Sheets API
  - Gemini AI API
  - htmlcsstoimage.com API
- **Deployment URL**: https://mahjong-line-bot.ogaiku.workers.dev
- **Repository**: https://github.com/ogaiku-wospe/mahjong-line-bot

### Known Limitations
- 統計画像生成には20-30秒かかる場合があります
- Cloudflare Workers無料プランの制限内で動作

[1.0.0]: https://github.com/ogaiku-wospe/mahjong-line-bot/releases/tag/v1.0.0
