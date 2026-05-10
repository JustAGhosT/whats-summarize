/**
 * ConvoLens Chrome Extension - Options Page Script
 */

// Storage keys (must match config.ts)
const STORAGE_KEYS = {
  authToken: 'authToken',
  user: 'user',
  settings: 'settings',
  extractionHistory: 'extractionHistory',
  pendingUploads: 'pendingUploads',
};

// Default settings
const DEFAULT_SETTINGS = {
  autoExtract: false,
  showNotifications: true,
  extractMediaMetadata: true,
  maxStoredExtractions: 50,
  theme: 'auto',
  apiEndpoint: '',
};

// DOM Elements
const elements = {
  // Account
  loggedOut: document.getElementById('loggedOut'),
  loggedIn: document.getElementById('loggedIn'),
  userEmail: document.getElementById('userEmail'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Settings
  showNotifications: document.getElementById('showNotifications'),
  extractMediaMetadata: document.getElementById('extractMediaMetadata'),
  theme: document.getElementById('theme'),
  apiEndpoint: document.getElementById('apiEndpoint'),
  maxStoredExtractions: document.getElementById('maxStoredExtractions'),

  // Stats
  totalExtractions: document.getElementById('totalExtractions'),
  pendingUploads: document.getElementById('pendingUploads'),
  totalMessages: document.getElementById('totalMessages'),

  // History
  historyList: document.getElementById('historyList'),

  // Actions
  retryPending: document.getElementById('retryPending'),
  clearData: document.getElementById('clearData'),
  statusMessage: document.getElementById('statusMessage'),

  // Footer
  version: document.getElementById('version'),
  helpLink: document.getElementById('helpLink'),
  privacyLink: document.getElementById('privacyLink'),
};

// =============================================================================
// Initialization
// =============================================================================

async function init() {
  // Set version
  elements.version.textContent = chrome.runtime.getManifest().version;

  // Load and display data
  await loadAuthStatus();
  await loadSettings();
  await loadStats();
  await loadHistory();

  // Set up event listeners
  setupEventListeners();

  // Set up links
  const isDev = !chrome.runtime.getManifest().update_url;
  const baseUrl = isDev ? 'http://localhost:3000' : 'https://app.convolens.com';
  elements.helpLink.href = `${baseUrl}/help`;
  elements.privacyLink.href = `${baseUrl}/privacy`;
}

function setupEventListeners() {
  // Auth buttons
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.logoutBtn.addEventListener('click', handleLogout);

  // Settings changes
  elements.showNotifications.addEventListener('change', saveSettings);
  elements.extractMediaMetadata.addEventListener('change', saveSettings);
  elements.theme.addEventListener('change', saveSettings);
  elements.apiEndpoint.addEventListener('blur', saveSettings);
  elements.maxStoredExtractions.addEventListener('change', saveSettings);

  // Actions
  elements.retryPending.addEventListener('click', handleRetryPending);
  elements.clearData.addEventListener('click', handleClearData);
}

// =============================================================================
// Auth
// =============================================================================

async function loadAuthStatus() {
  const response = await chrome.runtime.sendMessage({ action: 'GET_AUTH_STATUS' });

  if (response.data?.isAuthenticated) {
    elements.loggedOut.style.display = 'none';
    elements.loggedIn.style.display = 'block';
    elements.userEmail.textContent = response.data.user?.email || 'Connected';
  } else {
    elements.loggedOut.style.display = 'block';
    elements.loggedIn.style.display = 'none';
  }
}

function handleLogin() {
  const isDev = !chrome.runtime.getManifest().update_url;
  const baseUrl = isDev ? 'http://localhost:3000' : 'https://app.convolens.com';
  chrome.tabs.create({ url: `${baseUrl}/login?extension=true` });
}

async function handleLogout() {
  await chrome.runtime.sendMessage({ action: 'LOGOUT' });
  await loadAuthStatus();
  showStatus('Logged out successfully', 'success');
}

// =============================================================================
// Settings
// =============================================================================

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
  const settings = response.data || DEFAULT_SETTINGS;

  elements.showNotifications.checked = settings.showNotifications;
  elements.extractMediaMetadata.checked = settings.extractMediaMetadata;
  elements.theme.value = settings.theme;
  elements.apiEndpoint.value = settings.apiEndpoint || '';
  elements.maxStoredExtractions.value = settings.maxStoredExtractions.toString();
}

async function saveSettings() {
  const settings = {
    showNotifications: elements.showNotifications.checked,
    extractMediaMetadata: elements.extractMediaMetadata.checked,
    theme: elements.theme.value,
    apiEndpoint: elements.apiEndpoint.value.trim(),
    maxStoredExtractions: parseInt(elements.maxStoredExtractions.value, 10),
  };

  const response = await chrome.runtime.sendMessage({
    action: 'UPDATE_SETTINGS',
    settings,
  });

  if (response.success) {
    showStatus('Settings saved', 'success');
  } else {
    showStatus('Failed to save settings', 'error');
  }
}

// =============================================================================
// Statistics
// =============================================================================

async function loadStats() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.extractionHistory,
    STORAGE_KEYS.pendingUploads,
  ]);

  const history = stored[STORAGE_KEYS.extractionHistory] || [];
  const pending = stored[STORAGE_KEYS.pendingUploads] || [];

  elements.totalExtractions.textContent = history.length.toString();
  elements.pendingUploads.textContent = pending.length.toString();

  // Calculate total messages
  const totalMessages = history.reduce((sum, item) => sum + (item.messageCount || 0), 0);
  elements.totalMessages.textContent = formatNumber(totalMessages);
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// =============================================================================
// History
// =============================================================================

async function loadHistory() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.extractionHistory]);
  const history = stored[STORAGE_KEYS.extractionHistory] || [];

  if (history.length === 0) {
    elements.historyList.innerHTML = `
      <p style="color: #666; text-align: center; padding: 20px;">No extractions yet</p>
    `;
    return;
  }

  elements.historyList.innerHTML = history
    .slice(0, 20)
    .map(item => `
      <div class="history-item">
        <div>
          <div class="history-name">${escapeHtml(item.chatName)}</div>
          <div class="history-meta">${item.messageCount} messages</div>
        </div>
        <div class="history-meta">${formatDate(item.extractedAt)}</div>
      </div>
    `)
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// =============================================================================
// Actions
// =============================================================================

async function handleRetryPending() {
  elements.retryPending.disabled = true;
  elements.retryPending.textContent = 'Retrying...';

  try {
    const response = await chrome.runtime.sendMessage({ action: 'RETRY_PENDING_UPLOADS' });

    if (response.success) {
      const { processed, failed, remaining } = response.data;
      showStatus(
        `Processed: ${processed}, Failed: ${failed}, Remaining: ${remaining}`,
        processed > 0 ? 'success' : 'error'
      );
      await loadStats();
    } else {
      showStatus(response.error || 'Failed to retry uploads', 'error');
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  } finally {
    elements.retryPending.disabled = false;
    elements.retryPending.textContent = 'Retry Pending Uploads';
  }
}

async function handleClearData() {
  if (!confirm('Are you sure you want to clear all extension data? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.clear();

    // Re-initialize default settings
    await chrome.storage.local.set({
      [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
      [STORAGE_KEYS.pendingUploads]: [],
      [STORAGE_KEYS.extractionHistory]: [],
    });

    showStatus('All data cleared', 'success');
    await loadAuthStatus();
    await loadStats();
    await loadHistory();
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
}

// =============================================================================
// UI Helpers
// =============================================================================

function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status show ${type}`;

  setTimeout(() => {
    elements.statusMessage.classList.remove('show');
  }, 3000);
}

// =============================================================================
// Initialize
// =============================================================================

init();
