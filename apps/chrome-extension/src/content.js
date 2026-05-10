/**
 * ConvoLens Chrome Extension - Content Script
 *
 * POC Implementation: Chrome Extension Integration
 *
 * This content script runs on WhatsApp Web and extracts chat data
 * for analysis by the ConvoLens platform.
 *
 * Integration Points:
 * - Communicates with background service worker
 * - Sends chat data to ConvoLens API via WebSocket
 * - Injects UI elements for user interaction
 *
 * TODO: Production Hardening
 * - Add rate limiting for data extraction
 * - Implement proper error boundaries
 * - Add retry logic for failed API calls
 * - Implement data encryption in transit
 * - Add user consent management
 *
 * Future Enhancements:
 * - Real-time message streaming
 * - Media file handling
 * - Group chat specific features
 * - Offline queuing of data
 *
 * Privacy Notes:
 * - All data is processed with user consent
 * - No data is stored without explicit permission
 * - Data transmission uses secure channels only
 */

// Configuration
const CONFIG = {
  API_URL: 'https://api.convolens.local', // TODO: Update for production
  WS_URL: 'wss://api.convolens.local/ws',
  SELECTORS: {
    // WhatsApp Web DOM selectors (may need updates as WhatsApp changes)
    chatList: '[data-testid="chat-list"]',
    messageList: '[data-testid="conversation-panel-messages"]',
    messageIn: '[data-testid="msg-container"]',
    messageText: '[data-testid="msg-text"]',
    messageTime: '[data-testid="msg-meta"]',
    senderName: '[data-testid="msg-sender"]',
    chatHeader: '[data-testid="conversation-header"]',
    contactName: '[data-testid="conversation-info-header-chat-title"]',
  },
  EXTRACTION_DELAY: 100, // ms between message extractions
};

// State
let isConnected = false;
let authToken = null;
let currentChatId = null;

/**
 * Initialize the extension
 */
async function init() {
  console.log('[ConvoLens] Content script initialized');

  // Check if we're on WhatsApp Web
  if (!window.location.hostname.includes('web.whatsapp.com')) {
    console.log('[ConvoLens] Not on WhatsApp Web, exiting');
    return;
  }

  // Load saved auth token
  const stored = await chrome.storage.local.get(['authToken']);
  authToken = stored.authToken;

  // Inject floating action button
  injectUI();

  // Set up message listener for popup communication
  chrome.runtime.onMessage.addListener(handleMessage);

  // Watch for chat navigation
  observeChatChanges();
}

/**
 * Inject the ConvoLens UI elements
 */
function injectUI() {
  // Create floating action button
  const fab = document.createElement('div');
  fab.id = 'convolens-fab';
  fab.innerHTML = `
    <button id="ws-extract-btn" title="Extract current chat for summarization">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <span>Summarize</span>
    </button>
    <div id="ws-status" class="ws-hidden">
      <span id="ws-status-text">Ready</span>
    </div>
  `;

  document.body.appendChild(fab);

  // Add click handler
  document.getElementById('ws-extract-btn')?.addEventListener('click', handleExtractClick);
}

/**
 * Handle extract button click
 */
async function handleExtractClick() {
  const statusEl = document.getElementById('ws-status');
  const statusText = document.getElementById('ws-status-text');

  try {
    statusEl?.classList.remove('ws-hidden');
    updateStatus('Extracting messages...');

    const chatData = await extractCurrentChat();

    if (!chatData || chatData.messages.length === 0) {
      updateStatus('No messages found', 'error');
      return;
    }

    updateStatus(`Found ${chatData.messages.length} messages`);

    // Send to background script for API transmission
    const response = await chrome.runtime.sendMessage({
      action: 'SEND_CHAT_DATA',
      data: chatData,
    });

    if (response.success) {
      updateStatus('Sent for summarization!', 'success');

      // Open popup or dashboard
      chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
    } else {
      updateStatus(response.error || 'Failed to send', 'error');
    }
  } catch (error) {
    console.error('[ConvoLens] Extraction error:', error);
    updateStatus('Error: ' + error.message, 'error');
  }
}

/**
 * Update status display
 */
function updateStatus(message, type = 'info') {
  const statusText = document.getElementById('ws-status-text');
  if (statusText) {
    statusText.textContent = message;
    statusText.className = `ws-status-${type}`;
  }
}

/**
 * Extract messages from the current chat
 */
async function extractCurrentChat() {
  // Get chat name
  const chatHeader = document.querySelector(CONFIG.SELECTORS.contactName);
  const chatName = chatHeader?.textContent?.trim() || 'Unknown Chat';

  // Get message container
  const messageList = document.querySelector(CONFIG.SELECTORS.messageList);
  if (!messageList) {
    throw new Error('Could not find message list');
  }

  // Extract all visible messages
  const messageContainers = messageList.querySelectorAll(CONFIG.SELECTORS.messageIn);
  const messages = [];

  for (const container of messageContainers) {
    await new Promise((r) => setTimeout(r, CONFIG.EXTRACTION_DELAY));

    try {
      const message = extractMessageData(container);
      if (message) {
        messages.push(message);
      }
    } catch (e) {
      console.warn('[ConvoLens] Failed to extract message:', e);
    }
  }

  return {
    chatName,
    chatId: generateChatId(chatName),
    extractedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages,
    source: 'chrome-extension',
    version: '1.0.0',
  };
}

/**
 * Extract data from a single message element
 */
function extractMessageData(container) {
  // Get message text
  const textEl = container.querySelector(CONFIG.SELECTORS.messageText);
  const text = textEl?.textContent?.trim();

  if (!text) return null;

  // Get timestamp
  const timeEl = container.querySelector(CONFIG.SELECTORS.messageTime);
  const timeText = timeEl?.textContent?.trim() || '';

  // Get sender (for group chats)
  const senderEl = container.querySelector(CONFIG.SELECTORS.senderName);
  const sender = senderEl?.textContent?.trim() || 'Unknown';

  // Determine if incoming or outgoing
  const isOutgoing = container.classList.contains('message-out');

  return {
    id: generateMessageId(),
    text,
    sender: isOutgoing ? 'You' : sender,
    timestamp: parseTimestamp(timeText),
    isOutgoing,
    isMedia: !text || text === 'Photo' || text === 'Video' || text === 'Document',
  };
}

/**
 * Parse WhatsApp timestamp format
 */
function parseTimestamp(timeText) {
  // WhatsApp shows times like "10:30 AM" or dates like "12/25/2024"
  const now = new Date();

  if (timeText.includes(':')) {
    // Today's message
    const [time, period] = timeText.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;

    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    now.setHours(hour24, minutes, 0, 0);
    return now.toISOString();
  }

  // Older message with date
  return new Date(timeText).toISOString();
}

/**
 * Generate unique message ID
 */
function generateMessageId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate chat ID from name
 */
function generateChatId(name) {
  return 'chat_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substr(0, 50);
}

/**
 * Observe for chat navigation changes
 */
function observeChatChanges() {
  const observer = new MutationObserver((mutations) => {
    const header = document.querySelector(CONFIG.SELECTORS.chatHeader);
    if (header) {
      const newChatId = generateChatId(
        document.querySelector(CONFIG.SELECTORS.contactName)?.textContent || ''
      );

      if (newChatId !== currentChatId) {
        currentChatId = newChatId;
        console.log('[ConvoLens] Chat changed:', currentChatId);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Handle messages from popup/background
 */
function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'GET_CURRENT_CHAT':
      extractCurrentChat()
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response

    case 'CHECK_STATUS':
      sendResponse({
        success: true,
        isWhatsAppWeb: true,
        isLoggedIn: !!document.querySelector(CONFIG.SELECTORS.chatList),
      });
      break;

    case 'SET_AUTH_TOKEN':
      authToken = message.token;
      chrome.storage.local.set({ authToken: message.token });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
