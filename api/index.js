module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      found: false,
      error: 'Method not allowed'
    });
  }

  const username = String(req.query?.username || '').trim();

  if (!username) {
    return res.status(400).json({
      found: false,
      error: 'Missing required query parameter: username'
    });
  }

  const googleScriptUrl =
    'https://script.google.com/macros/s/AKfycbwil1Pw4edQcLthPIEqVQorCYvWsiRzlYYrpXD2oGBoUNlcT8vigoU6VFFeRn8otp3SVQ/exec';

  try {
    const url = new URL(googleScriptUrl);
    url.searchParams.set('username', username);

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(20000)
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error('Google HTTP status:', response.status);
      console.error('Google response:', rawText.slice(0, 500));

      return res.status(502).json({
        found: false,
        error: 'Google Apps Script returned an HTTP error',
        upstreamStatus: response.status,
        details: rawText.slice(0, 300)
      });
    }

    let json;

    try {
      json = JSON.parse(rawText);
    } catch (error) {
      console.error('Invalid Google response:', rawText.slice(0, 500));

      return res.status(502).json({
        found: false,
        error: 'Google returned a non-JSON response. Check deployment access and script execution logs.',
        responsePreview: rawText.slice(0, 200)
      });
    }

    if (json.success === true && Array.isArray(json.data)) {
      return res.status(200).json({
        found: json.data.length > 0,
        count: json.data.length,
        records: json.data
      });
    }

    return res.status(200).json({
      found: false,
      count: 0,
      message: json.message || json.error || 'User not found'
    });

  } catch (error) {
    console.error('Google Apps Script request failed:', error);

    return res.status(502).json({
      found: false,
      error: 'Failed to reach Google Apps Script endpoint',
      details: error.name === 'TimeoutError'
        ? 'Google Apps Script request timed out'
        : error.message
    });
  }
};
