# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-10-16

### Added
- **LINEメンション完全対応**
  - すべてのプレイヤー名指定コマンドでLINEメンションが使用可能に
  - 統計表示コマンド (`st`) でメンション対応
    - 例: `@麻雀点数管理bot st @虹太`
  - 統計画像コマンド (`stimg`) でメンション対応
    - 例: `@麻雀点数管理bot stimg @虹太`
  - プレイヤー登録コマンド (`pr`) でメンション対応
    - 例: `@麻雀点数管理bot pr @虹太 ogaiku`
    - メンション付きの場合は自動的に結びつけとして処理
  - AI推測コマンドでも完全対応
  - メンション未登録時は結びつけコマンド (`lk`) を提案

### Fixed
- **統計テキスト表示の数値フォーマット改善**
  - 平均点棒にカンマ区切りを追加
  - 変更: `avgRawScore.toFixed(0)` → `Math.round(avgRawScore).toLocaleString()`
  - 表示例: `28500点` → `28,500点`
  - 最高点棒・最低点棒と表示形式を統一

### Technical Details
- **Worker Version ID**: `50e217c2-8395-4cf4-b8cc-cc993e7b5c3d`
- **Upload Size**: 186.74 KiB (gzip: 35.08 KiB)
- LINE User IDから雀魂名への自動解決機能を統計・登録コマンドに実装
- 通常コマンドとAI推測コマンドの両方でメンション解決をサポート

## [1.1.0] - 2025-10-16

### Changed
- **LINE API無料プラン最適化（重要）**
  - 記録コマンド（`r`）が`replyToken`のみを使用するように最適化
  - 月間メッセージ上限（500通）にカウントされなくなり、無料プラン内で運用可能に
  - ユーザー体験の改善: 処理完了時に1通のメッセージのみ表示（処理中メッセージ削除）
  - 処理は同期的に実行されるため、数秒の待ち時間が発生
- **LINE API応答検証の追加**
  - `pushMessage`と`pushMessageWithQuickReply`のレスポンスステータスをチェック
  - エラー発生時に詳細なログを出力（429エラーなどの診断が容易に）
  - 成功時もログに記録
- **通知ミュート設定の削除**
  - `notificationDisabled: true`を削除し、通常の通知を有効化
  - これにより、ユーザーが確実にメッセージを受け取れるように改善

### Added
- **メンションと雀魂名の混在記録対応**
  - 1つのコマンドでLINEメンション（@user）と雀魂名を混在させて記録可能に
  - 例: `@麻雀点数管理bot r @虹太 25000 ogaiku 25000 Joath 25000 かとう71 25000`
  - AI推測コマンド実行時も元のメンション情報を保持
  - メンション未登録の場合は結びつけコマンドを提案

### Fixed
- **記録コマンドの完了通知が届かない問題を修正**
  - 原因: LINE APIの月間メッセージ上限（500通）に達していた
  - 解決: `replyToken`を活用することで上限にカウントされない設計に変更
- **UI表現の統一**
  - 絵文字（✅/❌）をテキスト表示（[成功]/[失敗]）に変更
  - 一括結びつけの結果表示をシンプルに

### Known Limitations
- 以下のコマンドは引き続き`pushMessage`を使用するため、月間上限の影響を受けます:
  - `img` (画像解析)
  - `ri` (ランキング画像生成)
  - `stimg` (統計画像生成)
  - `lk` (一括結びつけ)
  - AI推測コマンド（replyToken使用済みのため）
- 月間上限は毎月1日午前0時（日本時間）にリセットされます

### Technical Details
- **Worker Version ID**: `dc7120be-ba78-422f-ba90-b555f1ac8abc`
- **Upload Size**: 186.27 KiB (gzip: 34.99 KiB)
- AI推測コマンド実行のクロージャが`mentionedUsers`を保持
- メンション・雀魂名混在時の処理フロー改善
- `handleQuickRecord`メソッドのreplyToken優先設計への変更

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

[1.2.0]: https://github.com/ogaiku-wospe/mahjong-line-bot/releases/tag/v1.2.0
[1.1.0]: https://github.com/ogaiku-wospe/mahjong-line-bot/releases/tag/v1.1.0
[1.0.0]: https://github.com/ogaiku-wospe/mahjong-line-bot/releases/tag/v1.0.0
