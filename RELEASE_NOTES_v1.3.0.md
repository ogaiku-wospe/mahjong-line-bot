# Release Notes - v1.3.0

**リリース日**: 2025年10月16日  
**タイプ**: マイナーバージョンアップ  
**Worker Version ID**: `dc7120be-ba78-422f-ba90-b555f1ac8abc`

---

## 🎯 このリリースについて

LINE Messaging APIの無料プラン（月間500通制限）内で快適に運用できるよう、記録コマンドを最適化しました。

---

## 🚀 主な変更点

### 1. 記録コマンドの無料プラン対応 ⭐

**問題**: 
- 記録コマンドが2通のメッセージを送信していた（処理中+完了）
- 両方とも`pushMessage`を使用し、月間上限にカウント
- 月間500通に達すると、完了通知が届かなくなる

**解決策**:
- `replyToken`のみを使用する設計に変更
- 処理完了まで待ってから、1通のメッセージで結果を返す
- `replyToken`は月間上限にカウントされないため、無料プランで運用可能

**ユーザーへの影響**:
- ✅ 完了通知が確実に届くようになった
- ✅ 月間メッセージ数の大幅削減
- ⏱️ 応答が数秒遅くなる（Google Sheets処理待ち）
- 📱 メッセージが1通になりシンプルに

**変更前**:
```
[ユーザー] r ogaiku 50100 Joath 41900 ...
[Bot] ■ 記録を処理します
      四麻半莊
      ogaiku, Joath, ...
      処理完了まで少々お待ちください...
[Bot] [成功] 記録が完了しました  ← 月間上限に達すると届かない
```

**変更後**:
```
[ユーザー] r ogaiku 50100 Joath 41900 ...
（数秒待つ）
[Bot] [成功] 記録が完了しました
      
      四麻半莊
      ogaiku, Joath, Kawariku, なべち
      50,100, 41,900, 5,900, 2,100点
```

---

### 2. LINE API応答検証の強化

**追加機能**:
- `pushMessage`と`pushMessageWithQuickReply`のレスポンスをチェック
- エラー時に詳細なログを出力
- 成功時もログに記録

**メリット**:
- 429エラー（月間上限超過）などの問題を即座に診断可能
- デバッグが容易に

**ログ例**:
```
[INFO] pushMessage succeeded to: C1e3dfba17400c0fed2983748553548fc
[ERROR] pushMessage failed: 429 {"message":"You have reached your monthly limit."}
```

---

### 3. 通知設定の改善

**変更内容**:
- すべての`pushMessage`から`notificationDisabled: true`を削除
- botメッセージが通常の通知として届くようになった

**理由**:
- 以前は通知をミュートしていたため、メッセージを見逃す可能性があった
- 通知を有効化することで、ユーザーが確実にメッセージを受け取れるように

---

## ⚠️ 既知の制限

以下のコマンドは引き続き`pushMessage`を使用するため、月間上限（500通）の影響を受けます：

### 影響を受けるコマンド:
1. **`img`** (画像解析) - 解析に時間がかかるため
2. **`ri`** (ランキング画像生成) - 画像生成に時間がかかるため
3. **`stimg`** (統計画像生成) - 画像生成に時間がかかるため
4. **`lk`** (一括結びつけ) - 複数ユーザー処理に時間がかかるため
5. **AI推測コマンド** - `replyToken`が既に使用済みのため

### 月間上限について:
- **上限**: 月間500通（LINE無料プラン）
- **リセット**: 毎月1日午前0時（日本時間）
- **次回リセット**: 2025年11月1日

### 上限に達した場合の動作:
- 処理自体は成功する（Google Sheetsへの記録など）
- ただし完了通知が届かない（429エラー）
- 記録コマンド（`r`）は影響を受けない（replyToken使用のため）

---

## 📊 使用量の目安

### v1.0.0（最適化前）:
- 記録コマンド1回: 2通（処理中+完了）
- 250回の記録で上限到達

### v1.1.0（最適化後）:
- 記録コマンド1回: 0通（replyTokenのみ）
- 記録コマンドは上限に影響なし
- 画像解析やランキング生成に使用量を集中できる

---

## 🔧 技術的な詳細

### 変更されたメソッド:
- `handleQuickRecord()` - 記録処理メソッド
- `pushMessage()` - レスポンス検証追加
- `pushMessageWithQuickReply()` - レスポンス検証追加

### 設計パターン:
```javascript
if (replyToken) {
  // replyTokenがある場合: 同期処理
  const result = await processRecord();
  await lineAPI.replyMessage(replyToken, result);  // 無料
} else {
  // replyTokenがない場合: バックグラウンド処理
  await lineAPI.pushMessage(groupId, "処理中...");  // 有料
  ctx.waitUntil(async () => {
    const result = await processRecord();
    await lineAPI.pushMessage(groupId, result);  // 有料
  });
}
```

---

## 🎉 次のステップ

今後のバージョンで以下のコマンドも最適化予定:
- [ ] `img` - 画像解析コマンド
- [ ] `ri` - ランキング画像生成
- [ ] `stimg` - 統計画像生成
- [ ] `lk` - 一括結びつけ

---

## 📝 フィードバック

バグ報告や機能要望は、GitHubのIssuesにお願いします:
https://github.com/ogaiku-wospe/mahjong-line-bot/issues

---

## 🔗 関連リンク

- [CHANGELOG.md](./CHANGELOG.md) - 詳細な変更履歴
- [README.md](./README.md) - プロジェクト概要
- [GitHub Releases](https://github.com/ogaiku-wospe/mahjong-line-bot/releases/tag/v1.3.0)
