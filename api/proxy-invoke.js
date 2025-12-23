const UPSTREAM_URL = 'https://landy-ai.vercel.app/invoke';

function setCorsHeaders(res, originHeader, allowHeadersValue) {
  res.setHeader('Access-Control-Allow-Origin', originHeader ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', allowHeadersValue);
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowHeaders = req.headers['access-control-request-headers'] || 'Content-Type, Authorization';

  setCorsHeaders(res, origin, allowHeaders);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'OPTIONS, POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let payload;
  try {
    if (typeof req.body === 'string') {
      payload = JSON.parse(req.body);
    } else if (req.body && Object.keys(req.body).length > 0) {
      payload = req.body;
    } else {
      payload = await new Promise((resolve, reject) => {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (error) {
            reject(error);
          }
        });
        req.on('error', reject);
      });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  try {
    const upstreamResponse = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const text = await upstreamResponse.text();
    res.send(text);
  } catch (error) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
}
