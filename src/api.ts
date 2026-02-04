import { AgentRequestPayload, AgentResponse, AgentVersion, ApiErrorShape } from './types';

const ENDPOINTS: Record<AgentVersion, string> = {
  v1: 'https://landy-ai.vercel.app/invoke',
  v2: 'https://landy-ai.vercel.app/api/v2/invoke'
};

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

export async function invokeAgent(version: AgentVersion, payload: AgentRequestPayload): Promise<AgentResponse> {
  const url = ENDPOINTS[version];
  const response = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = (await safeJson(response)) as ApiErrorShape;
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return (await response.json()) as AgentResponse;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}
