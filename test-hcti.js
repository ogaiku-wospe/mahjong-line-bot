// Test HCTI API directly
const testHCTI = async () => {
  const USER_ID = process.env.HCTI_API_USER_ID;
  const API_KEY = process.env.HCTI_API_KEY;
  
  if (!USER_ID || !API_KEY) {
    console.error('Missing HCTI credentials');
    return;
  }
  
  console.log('Testing HCTI API...');
  console.log('User ID:', USER_ID);
  
  const auth = Buffer.from(`${USER_ID}:${API_KEY}`).toString('base64');
  
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="width: 1200px; height: 1400px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <h1>Test Image</h1>
</body>
</html>`;
  
  try {
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html,
        viewport_width: 1200,
        viewport_height: 1400,
        device_scale: 2,
        ms_delay: 1000
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.url) {
      console.log('✅ Image URL:', data.url);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testHCTI();
