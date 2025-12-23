const form = document.querySelector('.chat-input');
const textarea = document.querySelector('#message');
const chatLog = document.querySelector('.chat-log');
const submitButton = form?.querySelector('button[type="submit"]');
const statusEl = form?.querySelector('.status');

const API_ENDPOINT = 'https://landy-ai.vercel.app/invoke';

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
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_input: input }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();

  if (payload?.output) {
    return String(payload.output);
  }

  throw new Error('Malformed response from assistant.');
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
