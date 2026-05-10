/**
 * ConvoLens Chrome Extension - Background Service Worker
 *
 * POC Implementation: Chrome Extension Integration
 *
 * Handles communication between content script, popup, and ConvoLens API.
 *
 * TODO: Production Hardening
 * - Implement secure token storage
 * - Add request queuing for offline support
 * - Implement exponential backoff for retries
 * - Add telemetry and error reporting
 */

// Configuration
const API_BASE_URL = 'http://localhost:3001'; // TODO: Update for production

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Indicates async response
});

/**
 * Handle messages from content script and popup
 */
async function handleMessage(message, sender) {
  switch (message.action) {
    case 'SEND_CHAT_DATA':
      return await sendChatData(message.data);

    case 'OPEN_DASHBOARD':
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
      return { success: true };

    case 'GET_AUTH_STATUS':
      const stored = await chrome.storage.local.get(['authToken', 'user']);
      return {
        success: true,
        isAuthenticated: !!stored.authToken,
        user: stored.user,
      };

    case 'LOGIN':
      return await handleLogin(message.email, message.password);

    case 'LOGOUT':
      await chrome.storage.local.remove(['authToken', 'user']);
      return { success: true };

    default:
      return { success: false, error: 'Unknown action' };
  }
}

/**
 * Send extracted chat data to the API
 */
async function sendChatData(chatData) {
  try {
    const stored = await chrome.storage.local.get(['authToken']);

    if (!stored.authToken) {
      return { success: false, error: 'Not authenticated. Please log in first.' };
    }

    const response = await fetch(`${API_BASE_URL}/api/chat-export/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stored.authToken}`,
      },
      body: JSON.stringify(chatData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      return { success: false, error: error.message };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('[Background] Send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle user login
 */
async function handleLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      return { success: false, error: error.message };
    }

    const { token, user } = await response.json();

    await chrome.storage.local.set({ authToken: token, user });

    // Notify content script
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { action: 'SET_AUTH_TOKEN', token });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Install handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page on first install
    chrome.tabs.create({ url: 'http://localhost:3000/extension-welcome' });
  }
});
