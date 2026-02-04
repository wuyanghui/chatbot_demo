import { useCallback, useMemo, useState } from 'react';
import { AgentVersion, AgentRequestPayload, AgentResponse } from './types';
import { invokeAgent } from './api';

const AGENT_OPTIONS: { label: string; value: AgentVersion; description: string }[] = [
  {
    label: 'v1 Agent',
    value: 'v1',
    description: 'POST /invoke using user_input & state_id'
  },
  {
    label: 'v2 Agent',
    value: 'v2',
    description: 'POST /api/v2/invoke using message & thread_id'
  }
];

function App() {
  const [agentVersion, setAgentVersion] = useState<AgentVersion>('v1');
  const [userInput, setUserInput] = useState('');
  const [stateId, setStateId] = useState('');
  const [threadId, setThreadId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResponse | null>(null);

  const payload = useMemo<AgentRequestPayload>(() => {
    if (agentVersion === 'v1') {
      return {
        user_input: userInput,
        state_id: stateId
      } satisfies AgentRequestPayload;
    }

    return {
      message: userInput,
      thread_id: threadId
    } satisfies AgentRequestPayload;
  }, [agentVersion, stateId, threadId, userInput]);

  const canSubmit = useMemo(() => {
    return agentVersion === 'v1'
      ? Boolean(userInput.trim() && stateId.trim())
      : Boolean(userInput.trim() && threadId.trim());
  }, [agentVersion, stateId, threadId, userInput]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSubmit || isLoading) return;

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await invokeAgent(agentVersion, payload);
        setResult(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [agentVersion, canSubmit, isLoading, payload]
  );

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">Landy AI</p>
          <h1>Agent Console</h1>
          <p className="subtitle">Lightweight client for v1/v2 agent invocations</p>
        </div>
      </header>

      <main>
        <section className="panel">
          <form className="form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>Agent Version</legend>
              <div className="agent-options">
                {AGENT_OPTIONS.map((option) => (
                  <label key={option.value} className={agentVersion === option.value ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="agentVersion"
                      value={option.value}
                      checked={agentVersion === option.value}
                      onChange={() => setAgentVersion(option.value)}
                    />
                    <div>
                      <strong>{option.label}</strong>
                      <p>{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              <span>Message</span>
              <textarea
                placeholder="Enter your prompt"
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                rows={4}
              />
            </label>

            {agentVersion === 'v1' ? (
              <label>
                <span>State ID</span>
                <input
                  type="text"
                  placeholder="state identifier"
                  value={stateId}
                  onChange={(event) => setStateId(event.target.value)}
                />
              </label>
            ) : (
              <label>
                <span>Thread ID</span>
                <input
                  type="text"
                  placeholder="thread identifier"
                  value={threadId}
                  onChange={(event) => setThreadId(event.target.value)}
                />
              </label>
            )}

            <button type="submit" disabled={!canSubmit || isLoading}>
              {isLoading ? 'Invoking...' : 'Invoke Agent'}
            </button>

            {error && <p className="error">{error}</p>}
          </form>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Response</p>
              <h2>Graph Output &amp; Recommendations</h2>
            </div>
          </header>

          {!result && !error && <p className="muted">Invoke an agent to see results.</p>}

          {result && (
            <div className="response-grid">
              <article>
                <h3>Graph Output</h3>
                <pre>{JSON.stringify(result.graph_output, null, 2)}</pre>
              </article>
              <article>
                <h3>Recommended Listing</h3>
                <pre>{JSON.stringify(result.recommended_listing, null, 2)}</pre>
              </article>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
