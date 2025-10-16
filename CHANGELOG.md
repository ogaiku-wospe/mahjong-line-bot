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

### Added
- **メンションと雀魂名の混在記録対応**
  - 1つのコマンドでLINEメンション（@user）と雀魂名を混在させて記録可能に
  - 例: `@麻雀点数管理bot r @虹太 25000 ogaiku 25000 Joath 25000 かとう71 25000`
  - AI推測コマンド実行時も元のメンション情報を保持
  - メンション未登録の場合は結びつけコマンドを提案

### Changed
- **ウェルカムメッセージの改善**
  - 初期設定手順からヘルプ・AI補助機能の紹介へ変更
  - ユーザーが「コマンドを覚えなくても話しかければいい」ことを即座に理解できる構成
- **ヘルプテキストの簡素化**
  - LINE結びつけコマンドの例を1つに統一（複数人の例のみ）
  - 混乱を招く説明文「画像解析時に表示名が関連付けられます」を削除
- **通知設定の改善**
  - すべてのbotメッセージに`notificationDisabled: true`を追加
  - botの返信時に通知が送られなくなり、ユーザー体験が向上
- **UI表現の統一**
  - 絵文字（✅/❌）をテキスト表示（[成功]/[失敗]）に変更
  - 一括結びつけの結果表示をシンプルに

### Technical Details
- **Worker Version ID**: `1f050a94-4424-455a-a96f-1232ce163f0e`
- **Upload Size**: 183.70 KiB (gzip: 34.89 KiB)
- AI推測コマンド実行のクロージャが`mentionedUsers`を保持
- メンション・雀魂名混在時の処理フロー改善

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
