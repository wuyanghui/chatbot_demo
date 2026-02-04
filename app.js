const form = document.querySelector('.chat-input');
const textarea = document.querySelector('#message');
const chatLog = document.querySelector('.chat-log');
const submitButton = form?.querySelector('button[type="submit"]');
const statusEl = form?.querySelector('.status');
const hiddenModelInput = document.querySelector('#selected-model');
const modelButtons = document.querySelectorAll('.model-button');
const threadInput = document.querySelector('#thread-id');

const API_ENDPOINT = '/api/proxy-invoke';
const ALLOWED_ORIGIN = window.location.origin;

const MODEL_ENDPOINTS = {
  v1: '/api/proxy-invoke',
  v2: '/api/v2/invoke',
};

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
  if (role === 'assistant' && typeof content === 'object') {
    bubble.appendChild(renderStructuredResponse(content));
  } else {
    bubble.innerText = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  }
  chatLog.appendChild(bubble);
  bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function renderStructuredResponse(response) {
  const container = document.createElement('div');
  container.className = 'structured-response';

  if (response.graph_output) {
    container.appendChild(createSection('Graph Output', response.graph_output, 'graph-output'));
  }

  if (response.preferences) {
    container.appendChild(createPreferencesSection(response.preferences));
  }

  if (response.recommended_listings) {
    container.appendChild(createListingsSection(response.recommended_listings));
  }

  if (!container.children.length) {
    const fallback = document.createElement('pre');
    fallback.textContent = JSON.stringify(response, null, 2);
    container.appendChild(fallback);
  }

  return container;
}

function createSection(title, data, className) {
  const section = document.createElement('section');
  section.className = `response-section ${className}`;
  const heading = document.createElement('h4');
  heading.textContent = title;
  const content = document.createElement('pre');
  content.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  section.append(heading, content);
  return section;
}

function createPreferencesSection(preferences) {
  const section = document.createElement('section');
  section.className = 'response-section preferences-list';
  const heading = document.createElement('h4');
  heading.textContent = 'Preferences';
  section.appendChild(heading);

  if (Array.isArray(preferences)) {
    preferences.forEach((pref) => {
      const span = document.createElement('span');
      span.textContent = typeof pref === 'string' ? pref : JSON.stringify(pref);
      section.appendChild(span);
    });
  } else if (typeof preferences === 'object') {
    Object.entries(preferences).forEach(([key, value]) => {
      const span = document.createElement('span');
      span.innerHTML = `<strong>${key}:</strong> ${typeof value === 'string' ? value : JSON.stringify(value)}`;
      section.appendChild(span);
    });
  } else {
    section.appendChild(document.createTextNode(String(preferences)));
  }

  return section;
}

function createListingsSection(listings) {
  const section = document.createElement('section');
  section.className = 'response-section listings-section';
  const heading = document.createElement('h4');
  heading.textContent = 'Recommended Listings';
  section.appendChild(heading);

  const scroller = document.createElement('div');
  scroller.className = 'listings-scroll';

  const items = Array.isArray(listings) ? listings : [listings];
  items.forEach((listing, index) => {
    const card = document.createElement('article');
    card.className = 'listing-card';

    const title = document.createElement('h5');
    title.textContent = listing?.name || listing?.title || `Listing ${index + 1}`;
    card.appendChild(title);

    if (listing?.description) {
      const desc = document.createElement('p');
      desc.textContent = listing.description;
      card.appendChild(desc);
    }

    const meta = document.createElement('p');
    meta.textContent = JSON.stringify(listing, null, 2);
    card.appendChild(meta);

    scroller.appendChild(card);
  });

  section.appendChild(scroller);
  return section;
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
  const selectedModel = hiddenModelInput?.value || 'v1';
  const endpoint = MODEL_ENDPOINTS[selectedModel] || API_ENDPOINT;
  const providedThreadId = threadInput?.value.trim();
  const threadId = providedThreadId || (crypto.randomUUID?.() ?? `thread-${Date.now()}`);
  console.info('[requestCompletion] Dispatch', { selectedModel, endpoint, threadId });
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_input: input,
        thread_id: threadId,
        model: selectedModel,
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
      console.info('[requestCompletion] Payload keys', Object.keys(payload));
      return payload;
    }

    throw new Error('Assistant response missing expected data.');
  } catch (error) {
    logFetchError(error, { endpoint, origin: ALLOWED_ORIGIN });
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

modelButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.model;
    hiddenModelInput.value = selected;
    modelButtons.forEach((btn) => btn.classList.toggle('is-selected', btn === button));
  });
});
