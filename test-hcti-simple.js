// 非常にシンプルなHTMLでHTCTI APIをテスト
const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="width: 800px; height: 600px; background: #f0f0f0; padding: 20px;">
  <h1 style="color: #333;">テスト画像</h1>
  <p>これは簡単なテストです</p>
</body>
</html>
`;

const testHCTI = async () => {
  // 環境変数から認証情報を取得（wranglerが自動的に注入）
  const userId = process.env.HCTI_API_USER_ID;
  const apiKey = process.env.HCTI_API_KEY;
  
  if (!userId || !apiKey) {
    console.error('HCTI credentials not found');
    return;
  }
  
  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
  
  console.log('[TEST] Sending simple HTML to HCTI API...');
  console.log('[TEST] HTML length:', html.length);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: html,
        viewport_width: 800,
        viewport_height: 600,
        device_scale: 1,
        ms_delay: 0
      })
    });
    
    const elapsed = Date.now() - startTime;
    console.log('[TEST] Response status:', response.status);
    console.log('[TEST] Response time:', elapsed, 'ms');
    
    if (response.ok) {
      const data = await response.json();
      console.log('[TEST] Success! Image URL:', data.url);
    } else {
      const errorText = await response.text();
      console.error('[TEST] Error:', errorText);
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[TEST] Exception after', elapsed, 'ms:', error.message);
  }
};

testHCTI();
