const form = document.querySelector('.chat-input');
const textarea = document.querySelector('#message');
const chatLog = document.querySelector('.chat-log');
const submitButton = form?.querySelector('button[type="submit"]');
const statusEl = form?.querySelector('.status');

const API_ENDPOINT = 'https://landy-ai.vercel.app/invoke';
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
      mode: 'cors',
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

    const assistantMessage =
      payload?.graph_output ?? payload?.output ?? payload?.message;

    if (typeof assistantMessage === 'string' && assistantMessage.trim()) {
      return assistantMessage.trim();
    }

    if (Array.isArray(payload?.recommended_listing)) {
      return payload.recommended_listing
        .map((listing, index) => {
          const label = listing?.location ? `${index + 1}. ${listing.location}` : `${index + 1}. Listing`;
          const details = Object.entries(listing || {})
            .filter(([key, value]) => value && key !== 'location')
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          return [label, details].filter(Boolean).join('\n');
        })
        .join('\n\n');
    }

    throw new Error('Assistant response missing expected fields.');
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
