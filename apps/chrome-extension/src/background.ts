/**
 * ConvoLens Chrome Extension - Background Service Worker (Production)
 *
 * Handles all background operations for the extension:
 * - API communication with retry logic
 * - Authentication state management
 * - Offline queue processing
 * - Settings management
 * - Error tracking
 */

import {
  getConfig,
  STORAGE_KEYS,
  RATE_LIMIT_CONFIG,
  DEFAULT_SETTINGS,
  getTracingHeaders,
  type ExtensionMessage,
  type ExtensionResponse,
  type ExtensionSettings,
  type LoginMessage,
  type UpdateSettingsMessage,
  type SendChatDataMessage,
  type OpenDashboardMessage,
  type SetAuthTokenMessage,
} from './config';

// =============================================================================
// Types
// =============================================================================

interface PendingUpload {
  data: any;
  queuedAt: number;
  attempts: number;
}

interface RateLimitState {
  apiCallCount: number;
  resetTime: number;
}

// Storage key for persistent rate limiting
const RATE_LIMIT_STORAGE_KEY = 'ws_rate_limit_state';

// =============================================================================
// Message Handler
// =============================================================================

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: ExtensionResponse) => void) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
);

async function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<ExtensionResponse> {
  console.log('[Background] Received message:', message.action);

  switch (message.action) {
    case 'SEND_CHAT_DATA': {
      const typedMessage = message as SendChatDataMessage;
      return await sendChatData(typedMessage.data);
    }

    case 'OPEN_DASHBOARD': {
      const typedMessage = message as OpenDashboardMessage;
      return await openDashboard(typedMessage.path);
    }

    case 'GET_AUTH_STATUS':
      return await getAuthStatus();

    case 'LOGIN': {
      const typedMessage = message as LoginMessage;
      // Validate required fields
      if (!typedMessage.email || !typedMessage.password) {
        return { success: false, error: 'Email and password are required' };
      }
      return await handleLogin(typedMessage.email, typedMessage.password);
    }

    case 'LOGOUT':
      return await handleLogout();

    case 'GET_SETTINGS':
      return await getSettings();

    case 'UPDATE_SETTINGS': {
      const typedMessage = message as UpdateSettingsMessage;
      if (!typedMessage.settings || typeof typedMessage.settings !== 'object') {
        return { success: false, error: 'Settings object is required' };
      }
      return await updateSettings(typedMessage.settings);
    }

    case 'RETRY_PENDING_UPLOADS':
      return await retryPendingUploads();

    case 'CLEAR_PENDING_UPLOADS':
      return await clearPendingUploads();

    case 'GET_CURRENT_CHAT':
    case 'CHECK_STATUS':
    case 'SET_AUTH_TOKEN':
      // These are handled by content script, not background
      return { success: false, error: 'Action handled by content script' };

    default:
      return { success: false, error: 'Unknown action' };
  }
}

// =============================================================================
// API Communication
// =============================================================================

/**
 * Send chat data to the API with retry logic
 */
async function sendChatData(chatData: any): Promise<ExtensionResponse> {
  try {
    // Check authentication
    const stored = await chrome.storage.local.get([STORAGE_KEYS.authToken]);
    if (!stored[STORAGE_KEYS.authToken]) {
      return { success: false, error: 'Not authenticated. Please log in first.' };
    }

    // Check rate limiting (persistent across service worker restarts)
    const canProceed = await checkApiRateLimit();
    if (!canProceed) {
      // Queue for later
      await queuePendingUpload(chatData);
      return { success: false, error: 'Rate limited. Queued for later.' };
    }

    // Send with retry (include tracing headers for distributed tracing)
    const config = await getApiConfig();
    const result = await fetchWithRetry(`${config.apiUrl}/api/chat-export/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stored[STORAGE_KEYS.authToken]}`,
        ...getTracingHeaders(),
      },
      body: JSON.stringify(chatData),
    });

    // Track successful upload in history
    await trackExtractionHistory(chatData);

    return { success: true, data: result };
  } catch (error) {
    console.error('[Background] Send error:', error);

    // Queue for offline sync if network error
    if (isNetworkError(error)) {
      await queuePendingUpload(chatData);
      return { success: false, error: 'Network error. Saved for later sync.' };
    }

    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Track API call count persistently
      await incrementApiCallCount();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          await handleLogout();
          throw new Error('Authentication expired. Please log in again.');
        }

        // Don't retry on client errors (except rate limiting)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(errorData.message || `Request failed: ${response.status}`);
        }

        throw new Error(errorData.message || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Background] Fetch attempt ${attempt + 1} failed:`, error);

      // Don't retry on abort or auth errors
      if ((error as Error).name === 'AbortError' || (error as Error).message.includes('Authentication')) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

function isNetworkError(error: any): boolean {
  return error.name === 'TypeError' ||
         error.message?.includes('fetch') ||
         error.message?.includes('network') ||
         error.message?.includes('offline');
}

// =============================================================================
// Authentication
// =============================================================================

async function getAuthStatus(): Promise<ExtensionResponse> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.authToken, STORAGE_KEYS.user]);
  return {
    success: true,
    data: {
      isAuthenticated: !!stored[STORAGE_KEYS.authToken],
      user: stored[STORAGE_KEYS.user],
    },
  };
}

async function handleLogin(email: string, password: string): Promise<ExtensionResponse> {
  try {
    const config = await getApiConfig();

    const response = await fetch(`${config.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      return { success: false, error: error.message };
    }

    const { token, user } = await response.json();

    await chrome.storage.local.set({
      [STORAGE_KEYS.authToken]: token,
      [STORAGE_KEYS.user]: user,
    });

    // Notify content scripts
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'SET_AUTH_TOKEN', token }).catch(() => {});
      }
    }

    // Process any pending uploads
    retryPendingUploads().catch(console.error);

    return { success: true, data: { user } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function handleLogout(): Promise<ExtensionResponse> {
  await chrome.storage.local.remove([STORAGE_KEYS.authToken, STORAGE_KEYS.user]);

  // Notify content scripts
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'SET_AUTH_TOKEN', token: null }).catch(() => {});
    }
  }

  return { success: true };
}

// =============================================================================
// Settings Management
// =============================================================================

async function getSettings(): Promise<ExtensionResponse> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  const settings = { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEYS.settings] };
  return { success: true, data: settings };
}

async function updateSettings(newSettings: Partial<ExtensionSettings>): Promise<ExtensionResponse> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  const settings = { ...DEFAULT_SETTINGS, ...stored[STORAGE_KEYS.settings], ...newSettings };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
  return { success: true, data: settings };
}

async function getApiConfig() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.settings]);
  const settings = stored[STORAGE_KEYS.settings] || {};
  const config = getConfig();

  // Allow custom API endpoint
  if (settings.apiEndpoint) {
    return { ...config, apiUrl: settings.apiEndpoint };
  }

  return config;
}

// =============================================================================
// Pending Uploads (Offline Queue)
// =============================================================================

async function queuePendingUpload(data: any): Promise<void> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.pendingUploads]);
  const pending: PendingUpload[] = stored[STORAGE_KEYS.pendingUploads] || [];

  pending.push({
    data,
    queuedAt: Date.now(),
    attempts: 0,
  });

  // Keep only last 20 pending uploads, warn if dropping
  let dropped = 0;
  while (pending.length > 20) {
    pending.shift();
    dropped++;
  }

  if (dropped > 0) {
    console.warn(`[Background] Queue full. Dropped ${dropped} oldest upload(s) to make room.`);
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.pendingUploads]: pending });
  console.log('[Background] Queued pending upload. Total:', pending.length);
}

async function retryPendingUploads(): Promise<ExtensionResponse> {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.pendingUploads, STORAGE_KEYS.authToken]);

  if (!stored[STORAGE_KEYS.authToken]) {
    return { success: false, error: 'Not authenticated' };
  }

  const pending: PendingUpload[] = stored[STORAGE_KEYS.pendingUploads] || [];
  if (pending.length === 0) {
    return { success: true, data: { processed: 0 } };
  }

  let processed = 0;
  let failed = 0;
  const remaining: PendingUpload[] = [];

  for (const upload of pending) {
    // Skip if too many attempts
    if (upload.attempts >= 5) {
      console.warn('[Background] Dropping upload after max attempts');
      continue;
    }

    try {
      const result = await sendChatData(upload.data);
      if (result.success) {
        processed++;
      } else {
        upload.attempts++;
        remaining.push(upload);
        failed++;
      }
    } catch (error) {
      upload.attempts++;
      remaining.push(upload);
      failed++;
    }

    // Small delay between retries
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.pendingUploads]: remaining });

  return {
    success: true,
    data: { processed, failed, remaining: remaining.length },
  };
}

async function clearPendingUploads(): Promise<ExtensionResponse> {
  await chrome.storage.local.set({ [STORAGE_KEYS.pendingUploads]: [] });
  return { success: true };
}

// =============================================================================
// Extraction History
// =============================================================================

async function trackExtractionHistory(chatData: any): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.extractionHistory]);
    const history = stored[STORAGE_KEYS.extractionHistory] || [];

    history.unshift({
      chatName: chatData.chatName,
      messageCount: chatData.messageCount,
      extractedAt: chatData.extractedAt,
    });

    // Keep only last 100 entries
    while (history.length > 100) {
      history.pop();
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.extractionHistory]: history });
  } catch (error) {
    console.error('[Background] Failed to track history:', error);
  }
}

// =============================================================================
// Rate Limiting (Persistent across service worker restarts)
// =============================================================================

/**
 * Get rate limit state from persistent storage
 */
async function getRateLimitState(): Promise<RateLimitState> {
  const stored = await chrome.storage.local.get([RATE_LIMIT_STORAGE_KEY]);
  const state = stored[RATE_LIMIT_STORAGE_KEY] as RateLimitState | undefined;

  const now = Date.now();

  // Return existing state or create new one
  if (state && now < state.resetTime) {
    return state;
  }

  // Reset if expired or doesn't exist
  return {
    apiCallCount: 0,
    resetTime: now + 60000, // 1 minute window
  };
}

/**
 * Increment API call count with persistence
 */
async function incrementApiCallCount(): Promise<void> {
  const state = await getRateLimitState();
  state.apiCallCount++;
  await chrome.storage.local.set({ [RATE_LIMIT_STORAGE_KEY]: state });
}

/**
 * Check if API rate limit allows another call (persistent)
 */
async function checkApiRateLimit(): Promise<boolean> {
  const state = await getRateLimitState();
  return state.apiCallCount < RATE_LIMIT_CONFIG.maxApiCallsPerMinute;
}

// =============================================================================
// Dashboard & Navigation
// =============================================================================

async function openDashboard(path?: string): Promise<ExtensionResponse> {
  const config = await getApiConfig();
  const url = `${config.dashboardUrl}${path || '/dashboard'}`;
  await chrome.tabs.create({ url });
  return { success: true };
}

// =============================================================================
// Installation & Lifecycle
// =============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings
    await chrome.storage.local.set({
      [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
      [STORAGE_KEYS.pendingUploads]: [],
      [STORAGE_KEYS.extractionHistory]: [],
    });

    // Open welcome page
    const config = getConfig();
    await chrome.tabs.create({ url: `${config.dashboardUrl}/extension-welcome` });
  }

  if (details.reason === 'update') {
    // Process any pending uploads after update
    setTimeout(() => retryPendingUploads().catch(console.error), 5000);
  }
});

// Periodic sync of pending uploads
chrome.alarms.create('syncPendingUploads', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncPendingUploads') {
    retryPendingUploads().catch(console.error);
  }
});

// Listen for network status changes
self.addEventListener('online', () => {
  console.log('[Background] Back online, syncing pending uploads');
  retryPendingUploads().catch(console.error);
});

console.log('[Background] Service worker initialized');
