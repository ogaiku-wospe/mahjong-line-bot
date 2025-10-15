#!/bin/bash
echo "Cloudflare Workersのログを30秒間監視します..."
echo "別のウィンドウでLINEから画像を送信してください"
echo ""
timeout 30 npx wrangler tail --format pretty 2>&1 | tee last-logs.txt
echo ""
echo "ログは last-logs.txt に保存されました"
