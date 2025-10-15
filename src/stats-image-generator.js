// 統計グラフ画像生成クラス
import { formatJSTDateTime } from './utils.js';

export class StatsImageGenerator {
  constructor(config, env, kv) {
    this.config = config;
    this.env = env;
    this.kv = kv;
  }

  // 統計グラフ画像を生成（PNG形式）
  async generateStatsImage(playerStats, playerName, records, seasonKey) {
    try {
      console.log('[INFO] Generating stats image for:', playerName);
      
      const html = this.generateStatsHTML(playerStats, playerName, records, seasonKey);
      console.log('[INFO] Stats HTML generated, length:', html.length);
      
      const conversionResult = await this.convertHtmlToPng(html);
      
      if (!conversionResult.success) {
        throw new Error('PNG conversion failed');
      }
      
      console.log(`[INFO] Conversion method: ${conversionResult.method}`);
      
      // KVストレージに保存
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const imageKey = `stats/${timestamp}-${random}.png`;
      
      let imageData;
      let contentType = 'image/png';
      
      if (conversionResult.buffer) {
        // ArrayBufferをBase64に変換
        const uint8Array = new Uint8Array(conversionResult.buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        imageData = base64;
        console.log('[INFO] PNG image prepared, size:', conversionResult.buffer.byteLength, 'bytes');
      } else {
        throw new Error('No valid image data');
      }
      
      console.log('[INFO] Storing in KV...');
      await this.kv.put(imageKey, imageData, {
        expirationTtl: 86400, // 24時間
        metadata: {
          contentType,
          method: conversionResult.method,
          playerName,
          seasonKey,
          createdAt: formatJSTDateTime(new Date())
        }
      });
      
      const publicUrl = `https://mahjong-line-bot.ogaiku.workers.dev/images/${imageKey}`;
      console.log('[INFO] Stats image generation successful');
      console.log('[INFO] Public URL:', publicUrl);
      
      return {
        success: true,
        imageUrl: publicUrl,
        imageKey,
        format: 'png',
        method: conversionResult.method
      };
    } catch (error) {
      console.error('[ERROR] Stats image generation failed:', error);
      console.error('[ERROR] Error stack:', error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // HTMLテンプレート生成
  generateStatsHTML(playerStats, playerName, records, seasonKey) {
    // プレイヤーの記録のみをフィルタリング
    const playerRecords = records.filter(r => {
      const players = [
        r['プレイヤー1名'],
        r['プレイヤー2名'],
        r['プレイヤー3名'],
        r['プレイヤー4名']
      ];
      return players.includes(playerName);
    });

    // 時系列データを作成（累積スコア）
    let cumulativeScore = 0;
    const timeSeriesData = playerRecords.map((record, index) => {
      // プレイヤーの点数を取得
      let playerScore = 0;
      for (let i = 1; i <= 4; i++) {
        if (record[`プレイヤー${i}名`] === playerName) {
          playerScore = parseInt(record[`プレイヤー${i}点数`]) || 0;
          break;
        }
      }
      
      // 持ち点からの差分を計算（25000点スタート）
      const scoreDiff = playerScore - 25000;
      cumulativeScore += scoreDiff;
      
      return {
        gameNumber: index + 1,
        score: cumulativeScore,
        date: record['対戦日'] || '',
        time: record['対戦時刻'] || ''
      };
    });

    // 順位分布データ
    const rankData = [
      playerStats.rankDist[1] || 0,
      playerStats.rankDist[2] || 0,
      playerStats.rankDist[3] || 0,
      playerStats.rankDist[4] || 0
    ];

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${playerName}さんの統計</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      width: 1200px;
      min-height: 1400px;
    }
    .container {
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 42px;
      margin-bottom: 12px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .season-info {
      font-size: 20px;
      opacity: 0.95;
      margin-top: 8px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 32px;
      padding: 40px;
    }
    .stat-card {
      background: #f8f9fa;
      border-radius: 16px;
      padding: 28px;
      border: 2px solid #e9ecef;
    }
    .stat-card h2 {
      color: #495057;
      font-size: 22px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #667eea;
    }
    .stat-value {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      margin: 16px 0;
    }
    .stat-label {
      font-size: 18px;
      color: #6c757d;
      margin-bottom: 8px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-row-label {
      font-size: 18px;
      color: #495057;
    }
    .stat-row-value {
      font-size: 22px;
      font-weight: bold;
      color: #667eea;
    }
    .chart-container {
      grid-column: 1 / -1;
      background: #f8f9fa;
      border-radius: 16px;
      padding: 28px;
      border: 2px solid #e9ecef;
    }
    .chart-wrapper {
      position: relative;
      height: 380px;
    }
    .positive {
      color: #28a745;
    }
    .negative {
      color: #dc3545;
    }
    .footer {
      text-align: center;
      padding: 24px;
      color: #6c757d;
      font-size: 16px;
      background: #f8f9fa;
      border-top: 2px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${playerName}さんの統計</h1>
      <div class="season-info">シーズン: ${seasonKey}</div>
    </div>
    
    <div class="stats-grid">
      <!-- 総合成績 -->
      <div class="stat-card">
        <h2>📈 総合成績</h2>
        <div class="stat-row">
          <span class="stat-row-label">総対戦数</span>
          <span class="stat-row-value">${playerStats.totalGames}戦</span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">合計スコア</span>
          <span class="stat-row-value ${playerStats.totalScore >= 0 ? 'positive' : 'negative'}">
            ${playerStats.totalScore >= 0 ? '+' : ''}${playerStats.totalScore.toFixed(1)}pt
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">平均スコア</span>
          <span class="stat-row-value ${playerStats.avgScore >= 0 ? 'positive' : 'negative'}">
            ${playerStats.avgScore >= 0 ? '+' : ''}${playerStats.avgScore.toFixed(2)}pt
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">平均順位</span>
          <span class="stat-row-value">${playerStats.avgRank.toFixed(2)}位</span>
        </div>
      </div>

      <!-- 順位分布 -->
      <div class="stat-card">
        <h2>🏆 順位分布</h2>
        ${[1, 2, 3, 4].map(rank => {
          const count = playerStats.rankDist[rank] || 0;
          const rate = playerStats.totalGames > 0 ? (count / playerStats.totalGames * 100).toFixed(1) : 0;
          return `
            <div class="stat-row">
              <span class="stat-row-label">${rank}位</span>
              <span class="stat-row-value">${count}回 (${rate}%)</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- 点数統計 -->
      <div class="stat-card">
        <h2>💰 点数統計</h2>
        <div class="stat-row">
          <span class="stat-row-label">最高点棒</span>
          <span class="stat-row-value positive">${playerStats.maxScore.toLocaleString()}点</span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">最低点棒</span>
          <span class="stat-row-value negative">${playerStats.minScore.toLocaleString()}点</span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">平均点棒</span>
          <span class="stat-row-value">${playerStats.avgRawScore.toFixed(0)}点</span>
        </div>
      </div>

      <!-- スコア推移グラフ -->
      <div class="chart-container">
        <h2>📉 累積スコア推移</h2>
        <div class="chart-wrapper">
          <canvas id="lineChart"></canvas>
        </div>
      </div>

      <!-- 順位分布グラフ -->
      <div class="chart-container">
        <h2>🎯 順位分布グラフ</h2>
        <div class="chart-wrapper">
          <canvas id="barChart"></canvas>
        </div>
      </div>
    </div>

    <div class="footer">
      生成日時: ${formatJSTDateTime(new Date())}
    </div>
  </div>

  <script>
    // Chart.jsのデフォルト設定
    Chart.defaults.font.size = 16;
    Chart.defaults.font.family = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif";

    // 累積スコア推移グラフ
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(timeSeriesData.map(d => `第${d.gameNumber}戦`))},
        datasets: [{
          label: '累積スコア',
          data: ${JSON.stringify(timeSeriesData.map(d => d.score))},
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(102, 126, 234)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 16 },
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 16 },
            bodyFont: { size: 14 },
            callbacks: {
              label: function(context) {
                return '累積: ' + context.parsed.y.toFixed(1) + 'pt';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 14 },
              callback: function(value) {
                return value.toFixed(0) + 'pt';
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 14 },
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });

    // 順位分布グラフ
    const barCtx = document.getElementById('barChart').getContext('2d');
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['1位', '2位', '3位', '4位'],
        datasets: [{
          label: '回数',
          data: ${JSON.stringify(rankData)},
          backgroundColor: [
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)'
          ],
          borderWidth: 2
        }]
      },
      plugins: [ChartDataLabels],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 16 },
            bodyFont: { size: 14 }
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#495057',
            font: {
              size: 18,
              weight: 'bold'
            },
            formatter: function(value, context) {
              const total = ${playerStats.totalGames};
              const rate = total > 0 ? (value / total * 100).toFixed(1) : 0;
              return value + '回\\n(' + rate + '%)';
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 14 },
              stepSize: 1
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 16 }
            }
          }
        }
      }
    });
  </script>
</body>
</html>
    `.trim();

    return html;
  }

  // HTMLをPNGに変換
  async convertHtmlToPng(html) {
    try {
      console.log('[INFO] Attempting PNG conversion via image_generation tool');
      
      // image_generation APIを使用してHTMLから画像を生成
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: `Convert this HTML to a high-quality image: ${html.substring(0, 4000)}`,
          size: '1024x1024',
          quality: 'hd',
          n: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].url) {
          // 画像URLから画像データを取得
          const imageResponse = await fetch(data.data[0].url);
          const imageBuffer = await imageResponse.arrayBuffer();
          
          return {
            success: true,
            buffer: imageBuffer,
            method: 'openai-api'
          };
        }
      }
      
      console.log('[WARN] OpenAI API conversion failed, trying Cloudflare Browser Rendering API');
      
      // Cloudflare Browser Rendering APIを使用（利用可能な場合）
      if (this.env.BROWSER) {
        const browser = await this.env.BROWSER.launch();
        const page = await browser.newPage();
        await page.setContent(html);
        await page.setViewport({ width: 1200, height: 1400 });
        
        // グラフの描画完了を待つ
        await page.waitForTimeout(2000);
        
        const screenshot = await page.screenshot({ 
          type: 'png',
          fullPage: true
        });
        
        await browser.close();
        
        return {
          success: true,
          buffer: screenshot,
          method: 'cloudflare-browser'
        };
      }
      
      throw new Error('No PNG conversion method available');
      
    } catch (error) {
      console.error('[ERROR] PNG conversion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
