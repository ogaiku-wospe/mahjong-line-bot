# デプロイ記録

## 最新デプロイ

### 2025-10-16 05:39:03 JST
**Version ID**: 03c75cc1-af28-4004-9c6e-5915675d379a  
**Author**: ogaiku@utd-tec.com  
**Status**: ✅ Success  
**Worker URL**: https://mahjong-line-bot.ogaiku.workers.dev

#### デプロイ内容
- 統計コマンドのエラー修正（toFixed エラー）
- AI推測コマンドの実行改善
- プロパティ名の統一（totalGames, avgScore, avgRank, rankDist）
- AI出力のクリーニング処理追加
- エラーハンドリングの改善

#### アップロードサイズ
- Total: 173.64 KiB
- gzip: 32.06 KiB

#### GitHub Commit
- **Branch**: main
- **Commit**: 39b4ecc
- **Message**: fix(stats,ai): Fix stats command error and improve AI command execution

#### テスト状況
- [ ] 統計コマンド (`@麻雀点数管理bot st ogaiku`)
- [ ] AI推測コマンド (`@麻雀点数管理bot らんく`)
- [ ] その他の推測コマンド

---

## デプロイ履歴

### 2025-10-16 05:10:24 JST
**Version ID**: b958a411-52fb-494b-98f2-75529e824cea  
**Status**: ✅ Success

### 2025-10-16 05:09:24 JST
**Version ID**: 4548eb97-3fd9-4828-a457-285574f4513c  
**Status**: ✅ Success

### 2025-10-16 05:00:39 JST
**Version ID**: e1350095-6107-4ddf-84d2-2ff8cd1ea197  
**Status**: ✅ Success

### 2025-10-16 04:58:53 JST
**Version ID**: 2d7c346a-8316-4b15-9ec9-101423cfd7fa  
**Status**: ✅ Success

### 2025-10-16 04:57:27 JST
**Version ID**: 04178b65-cfb7-4f64-96d5-3fdd7983c042  
**Status**: ✅ Success

### 2025-10-16 04:54:40 JST
**Version ID**: 883c1674-c29c-4e14-bd74-237995cee905  
**Status**: ✅ Success

### 2025-10-16 04:54:30 JST
**Version ID**: 5e54829e-7d90-4b53-ba6c-c47f968adb48  
**Source**: Secret Change  
**Status**: ✅ Success

### 2025-10-16 04:47:11 JST
**Version ID**: 9a06b538-2e80-44e5-8377-eafa912c275e  
**Status**: ✅ Success

### 2025-10-16 04:44:29 JST
**Version ID**: 31c5d957-d540-4092-a931-f51dc2d53fd4  
**Status**: ✅ Success

---

## ロールバック手順

万が一、デプロイに問題がある場合は以下のコマンドでロールバックできます：

```bash
# 特定のバージョンにロールバック
npx wrangler rollback [VERSION_ID]

# 例: 前のバージョンに戻す
npx wrangler rollback b958a411-52fb-494b-98f2-75529e824cea
```

---

## モニタリング

### リアルタイムログ
```bash
npx wrangler tail --format pretty
```

### デプロイ一覧
```bash
npx wrangler deployments list
```

### Worker情報
```bash
npx wrangler deployments view
```

---

**最終更新**: 2025-10-16 05:39 JST
