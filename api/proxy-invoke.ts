import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENDPOINT_MAP = {
  v1: 'https://landy-ai.vercel.app/invoke',
  v2: 'https://landy-ai.vercel.app/api/v2/invoke'
} as const;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { version, payload } = request.body ?? {};

    if (!version || !payload || !(version in ENDPOINT_MAP)) {
      return response.status(400).json({ error: 'Invalid payload: version (v1|v2) and payload are required' });
    }

    const upstream = ENDPOINT_MAP[version as keyof typeof ENDPOINT_MAP];
    const upstreamResponse = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await upstreamResponse.json();
    return response.status(upstreamResponse.status).json(data);
  } catch (error) {
    console.error('Proxy error', error);
    return response.status(500).json({ error: 'Proxy invocation failed' });
  }
}
