#!/bin/bash

# Cloudflare Workers デプロイスクリプト
# 使い方: ./deploy.sh

set -e

echo "🚀 Cloudflare Workers へのデプロイを開始します..."
echo ""

# Wranglerの認証状態を確認
echo "📋 認証状態を確認中..."
if npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
    echo "⚠️  Cloudflareに未認証です。"
    echo "💡 以下のコマンドを実行して認証してください："
    echo "   npx wrangler login"
    echo ""
    exit 1
fi

echo "✅ 認証済み"
echo ""

# デプロイ実行
echo "📦 デプロイを実行中..."
npx wrangler deploy

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "🔍 デプロイ情報を確認:"
echo "   npx wrangler deployments list"
echo ""
echo "📊 リアルタイムログを確認:"
echo "   npx wrangler tail --format pretty"
echo ""
