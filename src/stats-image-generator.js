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
      console.log('[INFO] === Starting stats image generation ===');
      console.log('[INFO] Player:', playerName);
      console.log('[INFO] Total games:', playerStats.totalGames);
      
      console.log('[INFO] Step 1: Generating HTML...');
      const html = this.generateStatsHTML(playerStats, playerName, records, seasonKey);
      console.log('[INFO] HTML generated, length:', html.length);
      
      console.log('[INFO] Step 2: Converting HTML to PNG...');
      const conversionResult = await this.convertHtmlToPng(html);
      
      if (!conversionResult.success) {
        console.error('[ERROR] Conversion failed:', conversionResult.error);
        throw new Error(`PNG conversion failed: ${conversionResult.error}`);
      }
      
      console.log('[INFO] Step 3: Processing conversion result...');
      console.log(`[INFO] Conversion method: ${conversionResult.method}`);
      
      // HCTI URLを直接返す（KV保存をスキップしてCPU時間を節約）
      if (conversionResult.url) {
        console.log('[INFO] Stats image generation COMPLETED (direct URL)');
        console.log('[INFO] HCTI URL:', conversionResult.url);
        return {
          success: true,
          imageUrl: conversionResult.url,
          format: 'png',
          method: conversionResult.method
        };
      }
      
      // 後方互換性: bufferがある場合はKVに保存
      if (conversionResult.buffer) {
        console.log('[INFO] Converting buffer to base64...');
        const uint8Array = new Uint8Array(conversionResult.buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        console.log('[INFO] Buffer converted, size:', conversionResult.buffer.byteLength, 'bytes');
        
        console.log('[INFO] Storing in KV...');
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const imageKey = `stats/${timestamp}-${random}.png`;
        
        await this.kv.put(imageKey, base64, {
          expirationTtl: 86400,
          metadata: {
            contentType: 'image/png',
            method: conversionResult.method,
            playerName,
            seasonKey,
            createdAt: new Date().toISOString()
          }
        });
        
        const publicUrl = `https://mahjong-line-bot.ogaiku.workers.dev/images/${imageKey}`;
        console.log('[INFO] Stats image stored in KV');
        console.log('[INFO] Public URL:', publicUrl);
        
        return {
          success: true,
          imageUrl: publicUrl,
          imageKey,
          format: 'png',
          method: conversionResult.method
        };
      }
      
      throw new Error('No valid image URL or buffer in conversion result');
      
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
        globalGameNumber: parseInt(record['対戦番号']) || (index + 1),  // グローバル対戦番号を追加
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

    // ランダムなグラデーションカラーを生成（ヘッダーとボディで統一）
    const gradientColor = this.getRandomGradient();

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
      background: linear-gradient(135deg, ${gradientColor});
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
      background: linear-gradient(135deg, ${gradientColor});
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
      height: 550px;
      padding-top: 60px;
      padding-bottom: 20px;
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
        labels: ${JSON.stringify(timeSeriesData.map(d => `第${d.globalGameNumber}戦`))},
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
            offset: 4,
            color: '#495057',
            font: {
              size: 17,
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
            max: ${Math.ceil(Math.max(...rankData) * 1.2)},
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
      console.log('[INFO] Converting HTML to PNG...');
      console.log('[DEBUG] Environment variables check:');
      console.log('  HCTI_API_USER_ID:', this.env.HCTI_API_USER_ID ? 'SET' : 'NOT SET');
      console.log('  HCTI_API_KEY:', this.env.HCTI_API_KEY ? 'SET' : 'NOT SET');

      if (!this.env.HCTI_API_USER_ID || !this.env.HCTI_API_KEY) {
        throw new Error('HCTI API credentials not configured');
      }

      console.log('[INFO] Trying htmlcsstoimage.com API...');
      
      const auth = btoa(`${this.env.HCTI_API_USER_ID}:${this.env.HCTI_API_KEY}`);
      const response = await fetch('https://hcti.io/v1/image', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          html: html,
          viewport_width: 1200,
          viewport_height: 1600
        })
      });

      if (response.ok) {
        console.log('[INFO] HCTI API response OK, parsing JSON...');
        const text = await response.text();
        console.log('[INFO] Response text length:', text.length);
        const data = JSON.parse(text);
        console.log('[INFO] HCTI API returned URL:', data.url);
        console.log('[INFO] HCTI conversion successful, returning URL directly');
        return { success: true, url: data.url, method: 'hcti-url' };
      } else {
        const errorText = await response.text();
        console.error('[ERROR] HCTI API error response:', response.status, errorText);
        throw new Error(`HCTI API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[ERROR] PNG conversion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ランダムなグラデーションカラーを生成
  getRandomGradient() {
    const gradients = [
      '#667eea 0%, #764ba2 100%',
      '#f093fb 0%, #f5576c 100%',
      '#4facfe 0%, #00f2fe 100%',
      '#43e97b 0%, #38f9d7 100%',
      '#fa709a 0%, #fee140 100%',
      '#30cfd0 0%, #330867 100%',
      '#a8edea 0%, #fed6e3 100%',
      '#ff9a9e 0%, #fecfef 100%, #fecfef 100%',
      '#ffecd2 0%, #fcb69f 100%',
      '#ff6e7f 0%, #bfe9ff 100%'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  }
}
