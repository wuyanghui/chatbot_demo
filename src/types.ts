export type AgentVersion = 'v1' | 'v2';

export type V1Payload = {
  user_input: string;
  state_id: string;
};

export type V2Payload = {
  message: string;
  thread_id: string;
};

export type AgentRequestPayload = V1Payload | V2Payload;

export type AgentResponse = {
  graph_output: unknown;
  recommended_listing: unknown;
};

export type ApiErrorShape = {
  error?: string;
  message?: string;
  details?: unknown;
};
