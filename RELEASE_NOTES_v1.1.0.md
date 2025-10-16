# Release v1.1.0 - UX Improvements and Mixed Mention Support

## 🎉 新機能

### メンションと雀魂名の混在記録対応
1つのコマンドでLINEメンション（@user）と雀魂名を自由に組み合わせて記録できるようになりました。

**使用例:**
```
@麻雀点数管理bot r @虹太 25000 ogaiku 25000 Joath 25000 かとう71 25000
```

**技術的詳細:**
- AI推測コマンド実行時も元の`mentionedUsers`情報を保持
- メンション未登録の場合は結びつけコマンド（`lk`）を提案
- プレイヤー数と点数の数を自動検証

## ✨ 改善

### ウェルカムメッセージの刷新
botをグループに招待した際のメッセージを改善しました。

**変更前:** 初期設定手順（シーズン作成、プレイヤー登録など）を表示
**変更後:** ヘルプ機能とAIコマンド補助機能を強調

**新しいメッセージの特徴:**
- 「コマンドを覚えなくても話しかければいい」ことを即座に理解できる
- 自然言語での問いかけ例を5つ提示
- ヘルプコマンドへの誘導を明確に

### ヘルプテキストの簡素化
- LINE結びつけコマンドの例を1つに統一（複数人の例のみ表示）
- 混乱を招いた説明文「画像解析時に表示名が関連付けられます」を削除
- より直感的で理解しやすいヘルプに

### 通知設定の改善
すべてのbotメッセージに`notificationDisabled: true`を適用し、通知なしで送信されるようになりました。

**対象メソッド:**
- `replyMessage`
- `pushMessage`
- `pushMessageWithQuickReply`

### UI表現の統一
- 絵文字（✅/❌）をテキスト表示（[成功]/[失敗]）に変更
- より落ち着いた、テキストベースの表示に統一

## 🔧 技術情報

- **Worker Version ID**: `1f050a94-4424-455a-a96f-1232ce163f0e`
- **Upload Size**: 183.70 KiB (gzip: 34.89 KiB)
- **Platform**: Cloudflare Workers
- **Production URL**: https://mahjong-line-bot.ogaiku.workers.dev

## 📝 主なコミット

- `70f50e0` - feat: support mixed mention and mahjong names in AI suggested record commands
- `1d1d555` - refactor: simplify LINE linking help text by removing redundant single-user example
- `d109004` - feat: update welcome message to highlight help and AI assistant features
- `b345665` - feat: improve user experience - remove confusing text, emojis, unify commands

## 🔗 リンク

- [Full Changelog](https://github.com/ogaiku-wospe/mahjong-line-bot/compare/v1.0.0...v1.1.0)
- [Documentation](https://github.com/ogaiku-wospe/mahjong-line-bot/blob/main/README.md)
- [CHANGELOG.md](https://github.com/ogaiku-wospe/mahjong-line-bot/blob/main/CHANGELOG.md)

---

**リリース日**: 2025-10-16
**リリース担当**: ogaiku@utd-tec.com
