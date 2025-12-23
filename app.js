const form = document.querySelector('.chat-input');
const textarea = document.querySelector('#message');
const chatLog = document.querySelector('.chat-log');
const submitButton = form?.querySelector('button[type="submit"]');
const statusEl = form?.querySelector('.status');

const API_ENDPOINT = '/api/proxy-invoke';
const ALLOWED_ORIGIN = window.location.origin;

function logFetchError(error, context = {}) {
  console.groupCollapsed('[requestCompletion] Fetch failure');
  console.error(error);
  console.info('Context:', context);
  console.groupEnd();
}

function appendMessage(content, role = 'assistant') {
  if (!chatLog) return;
  const bubble = document.createElement('article');
  bubble.className = 'message';
  bubble.dataset.role = role;
  bubble.innerText = content;
  chatLog.appendChild(bubble);
  bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function setLoadingState(isLoading, message = '') {
  if (!submitButton || !statusEl || !textarea) return;
  submitButton.disabled = isLoading;
  textarea.disabled = isLoading;
  statusEl.textContent = message;
  if (!isLoading) {
    textarea.focus();
  }
}

async function requestCompletion(input) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_input: input,
        thread_id: crypto.randomUUID?.() ?? `thread-${Date.now()}`,
      }),
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '<unreadable body>');
      throw new Error(`Request failed (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Malformed JSON response: ${text}`);
    }

    if (typeof payload === 'string') {
      const normalized = payload.trim();
      if (normalized) {
        return normalized;
      }
    }

    if (payload && typeof payload === 'object') {
      const serialized = JSON.stringify(payload, null, 2);
      if (serialized) {
        return serialized;
      }
    }

    throw new Error('Assistant response missing expected data.');
  } catch (error) {
    logFetchError(error, { endpoint: API_ENDPOINT, origin: ALLOWED_ORIGIN });
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        'Network request failed. Please check your connection or CORS configuration.'
      );
    }
    throw error;
  }
}

function handleError(error) {
  console.error(error);
  appendMessage(
    error instanceof Error ? error.message : 'Something went wrong.',
    'error'
  );
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!textarea) return;

  const userMessage = textarea.value.trim();
  if (!userMessage) {
    textarea.focus();
    return;
  }

  appendMessage(userMessage, 'user');
  textarea.value = '';
  setLoadingState(true, 'Waiting for assistant…');

  try {
    const assistantReply = await requestCompletion(userMessage);
    appendMessage(assistantReply, 'assistant');
  } catch (error) {
    handleError(error);
  } finally {
    setLoadingState(false, '');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  textarea?.focus();
});
