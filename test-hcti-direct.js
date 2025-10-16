// HCTI APIを直接テスト（Cloudflare Workers外）
const testHCTI = async () => {
  // 環境変数から取得
  const userId = process.env.HCTI_API_USER_ID;
  const apiKey = process.env.HCTI_API_KEY;
  
  if (!userId || !apiKey) {
    console.error('❌ HCTI credentials not found in environment');
    console.log('Please set HCTI_API_USER_ID and HCTI_API_KEY');
    return;
  }
  
  console.log('✓ HCTI_API_USER_ID:', userId.substring(0, 8) + '...');
  console.log('✓ HCTI_API_KEY:', apiKey.substring(0, 8) + '...');
  
  const html = '<html><body><h1>Test</h1></body></html>';
  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');
  
  console.log('\n📡 Sending request to HCTI API...');
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
        viewport_height: 600
      })
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Response time: ${elapsed}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    const text = await response.text();
    console.log(`📄 Response: ${text.substring(0, 200)}`);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log(`✅ Success! Image URL: ${data.url}`);
    } else {
      console.log(`❌ Error: ${text}`);
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Exception after ${elapsed}ms:`, error.message);
  }
};

testHCTI();
