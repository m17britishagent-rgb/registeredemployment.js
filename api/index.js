const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ 
      found: false, 
      error: 'Missing required query parameter: username' 
    });
  }

  const googleScriptUrl = `https://script.google.com/macros/s/AKfycbwil1Pw4edQcLthPIEqVQorCYvWsiRzlYYrpXD2oGBoUNlcT8vigoU6VFFeRn8otp3SVQ/exec?username=${encodeURIComponent(username)}`;

  try {
    // Make request using native Node https module with redirect handling
    const rawData = await new Promise((resolve, reject) => {
      https.get(googleScriptUrl, (resp) => {
        // Handle Google Apps Script 302/303 Redirects automatically
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          https.get(resp.headers.location, (redirectResp) => {
            let data = '';
            redirectResp.on('data', (chunk) => { data += chunk; });
            redirectResp.on('end', () => resolve(data));
          }).on('error', reject);
          return;
        }

        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => resolve(data));
      }).on('error', (err) => reject(err));
    });

    // Check if Google returned an HTML page instead of JSON
    if (!rawData || rawData.trim().startsWith('<')) {
      return res.status(502).json({
        found: false,
        error: 'Google Apps Script returned an HTML page instead of JSON.',
        rawSnippet: rawData.substring(0, 100)
      });
    }

    const json = JSON.parse(rawData);

    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return res.status(200).json({
        found: true,
        count: json.count || json.data.length,
        records: json.data
      });
    }

    return res.status(200).json({
      found: false,
      message: "User not found on blacklist."
    });

  } catch (error) {
    return res.status(500).json({ 
      found: false, 
      error: 'Vercel Function Error',
      message: error.message 
    });
  }
};
