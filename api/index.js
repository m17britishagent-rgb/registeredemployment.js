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
    const response = await fetch(googleScriptUrl, { 
      redirect: 'follow',
      headers: { 'Accept': 'application/json' }
    });
    
    const rawText = await response.text();

    // Check if Google returned an HTML page instead of JSON
    if (!rawText || rawText.trim().startsWith('<')) {
      return res.status(502).json({
        found: false,
        error: 'Google Apps Script returned an HTML page instead of JSON.',
        rawSnippet: rawText.substring(0, 150)
      });
    }

    const json = JSON.parse(rawText);

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
    // 🔍 This will expose the exact error message on your front-end/client
    return res.status(500).json({ 
      found: false, 
      error: 'Vercel Function Caught an Error',
      message: error.message,
      stack: error.stack 
    });
  }
};
