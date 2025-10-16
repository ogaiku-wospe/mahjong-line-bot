# Release v1.2.0 - LINE Mention Full Support

## 🎉 新機能

### すべてのプレイヤー名指定コマンドでLINEメンション対応
雀魂のニックネームが必要なすべてのコマンドで、LINEメンションが使えるようになりました。

#### 対応コマンド

**1. 統計表示 (st)**
```
@麻雀点数管理bot st @虹太
```
メンションから自動的に雀魂名を取得して統計を表示します。

**2. 統計画像 (stimg)**
```
@麻雀点数管理bot stimg @虹太
```
メンションから自動的に雀魂名を取得して統計画像を生成します。

**3. プレイヤー登録 (pr)**
```
@麻雀点数管理bot pr @虹太 ogaiku
```
メンション付きの場合は自動的に「結びつけ」として処理されます。

#### 技術的詳細
- LINE User IDから雀魂名への自動解決
- 通常コマンドとAI推測コマンドの両方で対応
- メンション未登録時は結びつけコマンド (`lk`) を提案
- エラーメッセージでユーザーをガイド

**動作フロー:**
1. メンションがあるかチェック
2. LINE User IDから雀魂名を取得
3. 取得できた場合は統計表示/画像生成
4. 取得できない場合は結びつけコマンドを提案

**エラーメッセージ例:**
```
虹太さんはプレイヤー登録されていません。
「@麻雀点数管理bot lk @虹太 [雀魂名]」で結びつけてください。
```

## 🐛 修正

### 統計テキスト表示の数値フォーマット改善
平均点棒の表示にカンマ区切りを追加しました。

**変更前:**
```
平均点棒: 28500点
```

**変更後:**
```
平均点棒: 28,500点
```

**技術的詳細:**
- `avgRawScore.toFixed(0)` → `Math.round(avgRawScore).toLocaleString()`
- 最高点棒・最低点棒と表示形式を統一
- `toLocaleString()` で3桁ごとのカンマ区切りを自動適用

## 💡 使用例

### メンション完全対応の利点

**雀魂名を覚えていなくても使える:**
```
# 従来（雀魂名が必要）
@麻雀点数管理bot st ogaiku

# 新機能（メンションでOK）
@麻雀点数管理bot st @虹太
```

**複数コマンドで一貫した使い方:**
```
# 記録
@麻雀点数管理bot r @虹太 25000 ogaiku 25000

# 統計
@麻雀点数管理bot st @虹太

# 統計画像
@麻雀点数管理bot stimg @虹太
```

## 🔧 技術情報

- **Worker Version ID**: `50e217c2-8395-4cf4-b8cc-cc993e7b5c3d`
- **Upload Size**: 186.74 KiB (gzip: 35.08 KiB)
- **Platform**: Cloudflare Workers
- **Production URL**: https://mahjong-line-bot.ogaiku.workers.dev

## 📝 主なコミット

- `dd4d5f6` - feat: support LINE mentions for all player-name-required commands
- `31ac185` - fix: add thousand separators to average raw score in stats text display

## 🔗 リンク

- [Full Changelog](https://github.com/ogaiku-wospe/mahjong-line-bot/compare/v1.1.0...v1.2.0)
- [Documentation](https://github.com/ogaiku-wospe/mahjong-line-bot/blob/main/README.md)
- [CHANGELOG.md](https://github.com/ogaiku-wospe/mahjong-line-bot/blob/main/CHANGELOG.md)

---

**リリース日**: 2025-10-16
**リリース担当**: ogaiku@utd-tec.com
