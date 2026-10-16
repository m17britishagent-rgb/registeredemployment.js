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

  const googleScriptUrl = `https://script.google.com/macros/s/AKfycbx1ZAmQ2N-e5MoNmO7pDgYwoPgYsCl9NMlg2BpCmT46WcKM00SRI7Xmd4oEvhTsnipr/exec?username=${encodeURIComponent(username)}`;

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
        error: 'Google Apps Script returned an HTML page instead of JSON. Ensure deployment permission is set to "Anyone".'
      });
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(502).json({
        found: false,
        error: 'Failed to parse response from Google Apps Script as JSON.',
        raw: rawText.substring(0, 200)
      });
    }

    // Check if records exist and return the full array
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return res.status(200).json({
        found: true,
        count: json.count || json.data.length,
        records: json.data // Passes all events back to the client
      });
    }

    return res.status(200).json({
      found: false,
      message: "User not found on blacklist."
    });

  } catch (error) {
    return res.status(500).json({ 
      found: false, 
      error: 'Failed to reach Google Apps Script endpoint',
      details: error.message 
    });
  }
};
