# 画像解析機能のテスト手順とログ確認方法

## 📋 テスト手順

1. **LINEグループで画像解析コマンドを送信**
   ```
   @麻雀点数管理bot 画像解析
   ```
   または
   ```
   @麻雀点数管理bot img
   ```

2. **ボットからの返答を確認**
   - 「■ 画像解析モード」というメッセージが返ってくるか確認

3. **60秒以内に雀魂のスクリーンショットを送信**
   - 対戦結果画面の画像を送信

4. **ボットからの返答を確認**
   - 「📸 画像を受信しました」が表示されるか確認
   - 5-10秒後に解析結果が表示されるか確認

## 🔍 ログ確認方法

### 方法1: リアルタイムログ（ローカルPC推奨）

```bash
cd /home/user/webapp/current-project
npx wrangler tail --format pretty
```

この状態で、上記のテスト手順を実行すると、以下のようなログが表示されます：

```
[DEBUG] handleImageAnalysisRequest called - GroupId: C1234...
[DEBUG] messageHandler exists: true
[INFO] Image analysis mode activated for group: C1234...
[INFO] Timestamp set: 1697123456789
[INFO] Verification - stored timestamp: 1697123456789

[DEBUG] Image message received - Source type: group
[DEBUG] Image details - GroupId: C1234... MessageId: 567890...
[INFO] Image received - GroupId: C1234...
[INFO] Last mention time: 1697123456789
[INFO] Time since last mention: 5.234 seconds
[INFO] Image accepted! Starting analysis...
```

### 方法2: Cloudflareダッシュボード

1. https://dash.cloudflare.com/ にアクセス
2. Workers & Pages → mahjong-line-bot
3. "Logs" タブを開く
4. リアルタイムでログを確認

## 🐛 トラブルシューティング

### 問題: 画像解析コマンドに反応しない

**確認ポイント:**
- ボットが正しく@メンションされているか
- グループチャットで送信しているか（1対1チャットでは動作しません）
- ボット名が正確か（全角スペースなどに注意）

### 問題: 「■ 画像解析モード」は表示されるが、画像に反応しない

**ログで確認すべき内容:**
```
[DEBUG] handleImageAnalysisRequest called - GroupId: C1234...
[DEBUG] messageHandler exists: true  ← これがtrueであること
[INFO] Timestamp set: 1697123456789  ← タイムスタンプが記録されること
```

その後、画像送信時に：
```
[DEBUG] Image message received - Source type: group
[INFO] All tracked groups: ["C1234..."]  ← グループIDがリストに含まれること
[INFO] Time since last mention: XX seconds  ← 60秒以内であること
```

### 問題: 「画像を受信しました」は表示されるが、解析結果が返ってこない

**可能性:**
1. Vision API のエラー
2. Gemini API のエラー
3. 画像の解像度が低い/テキストが読めない

**ログで確認:**
```
[INFO] Starting image processing - GroupId: ...
[INFO] Calling Vision API...
[ERROR] Vision API error: ...  ← エラーの詳細をここで確認
```

## 📞 サポート

問題が解決しない場合は、以下の情報と共にお問い合わせください：

1. 実行したコマンド
2. ボットからの返答
3. `npx wrangler tail`で取得したログ
4. 送信した画像の種類（雀魂のスクリーンショットか）

