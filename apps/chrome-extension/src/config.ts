/**
 * Chrome Extension Configuration
 *
 * Production-ready configuration management for the ConvoLens extension.
 * Supports both development and production environments.
 */

// Environment detection
const isDevelopment = !chrome.runtime.getManifest().update_url;

// API Configuration
export const API_CONFIG = {
  // Production URLs (updated during build)
  production: {
    apiUrl: 'https://api.convolens.com',
    wsUrl: 'wss://api.convolens.com/ws',
    dashboardUrl: 'https://app.convolens.com',
  },
  // Development URLs
  development: {
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001/ws',
    dashboardUrl: 'http://localhost:3000',
  },
};

// Get current environment config
export function getConfig() {
  return isDevelopment ? API_CONFIG.development : API_CONFIG.production;
}

// WhatsApp Web DOM Selectors
// These may need updates as WhatsApp changes their UI
export const SELECTORS = {
  // Primary selectors (data-testid based - most stable)
  primary: {
    chatList: '[data-testid="chat-list"]',
    messageList: '[data-testid="conversation-panel-messages"]',
    messageContainer: '[data-testid="msg-container"]',
    messageText: '[data-testid="msg-text"]',
    messageTime: '[data-testid="msg-meta"]',
    senderName: '[data-testid="msg-sender"]',
    chatHeader: '[data-testid="conversation-header"]',
    contactName: '[data-testid="conversation-info-header-chat-title"]',
    scrollableMessageList: '[data-testid="conversation-panel-body"]',
  },
  // Fallback selectors (class-based - less stable)
  fallback: {
    chatList: '.copyable-area [role="listitem"]',
    messageList: '.message-list',
    messageContainer: '.message-in, .message-out',
    messageText: '.selectable-text span[dir="ltr"]',
    messageTime: '.copyable-text span[dir="auto"]',
    senderName: 'span[dir="auto"]._ahxt',
    chatHeader: 'header._ao8g',
    contactName: 'span[dir="auto"]._ao3e',
    scrollableMessageList: '._asmz',
  },
};

// Extraction configuration
export const EXTRACTION_CONFIG = {
  // Delay between message extractions to avoid rate limiting
  extractionDelayMs: 50,
  // Maximum messages to extract in one batch
  maxMessagesPerBatch: 500,
  // Timeout for extraction operations
  extractionTimeoutMs: 30000,
  // Retry configuration
  retryAttempts: 3,
  retryDelayMs: 1000,
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Maximum extractions per minute
  maxExtractionsPerMinute: 5,
  // Maximum API calls per minute
  maxApiCallsPerMinute: 10,
  // Cooldown period after rate limit hit
  cooldownMs: 60000,
};

// Storage keys
export const STORAGE_KEYS = {
  authToken: 'authToken',
  user: 'user',
  settings: 'settings',
  extractionHistory: 'extractionHistory',
  pendingUploads: 'pendingUploads',
};

// =============================================================================
// Correlation ID Generation
// =============================================================================

/**
 * Generate a unique correlation ID for tracing requests
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 14);
  return `ext_${timestamp}_${random}`;
}

/**
 * Get headers to include with API requests for tracing
 */
export function getTracingHeaders(): Record<string, string> {
  return {
    'x-correlation-id': generateCorrelationId(),
    'x-source': 'chrome-extension',
    'x-extension-version': chrome.runtime.getManifest().version,
  };
}

// Default settings
export interface ExtensionSettings {
  autoExtract: boolean;
  showNotifications: boolean;
  extractMediaMetadata: boolean;
  maxStoredExtractions: number;
  theme: 'light' | 'dark' | 'auto';
  apiEndpoint: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoExtract: false,
  showNotifications: true,
  extractMediaMetadata: true,
  maxStoredExtractions: 50,
  theme: 'auto',
  apiEndpoint: '',
};

// Message types for extension communication - Discriminated union for type safety

export interface GetCurrentChatMessage {
  action: 'GET_CURRENT_CHAT';
}

export interface CheckStatusMessage {
  action: 'CHECK_STATUS';
}

export interface SetAuthTokenMessage {
  action: 'SET_AUTH_TOKEN';
  token: string | null;
}

export interface SendChatDataMessage {
  action: 'SEND_CHAT_DATA';
  data: {
    chatName: string;
    chatId: string;
    extractedAt: string;
    messageCount: number;
    messages: Array<{
      id: string;
      text: string;
      sender: string;
      timestamp: string;
      isOutgoing: boolean;
      isMedia: boolean;
      mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
      replyTo?: string;
    }>;
    source: 'chrome-extension';
    version: string;
    isGroup: boolean;
  };
}

export interface OpenDashboardMessage {
  action: 'OPEN_DASHBOARD';
  path?: string;
}

export interface GetAuthStatusMessage {
  action: 'GET_AUTH_STATUS';
}

export interface LoginMessage {
  action: 'LOGIN';
  email: string;
  password: string;
}

export interface LogoutMessage {
  action: 'LOGOUT';
}

export interface GetSettingsMessage {
  action: 'GET_SETTINGS';
}

export interface UpdateSettingsMessage {
  action: 'UPDATE_SETTINGS';
  settings: Partial<ExtensionSettings>;
}

export interface ClearPendingUploadsMessage {
  action: 'CLEAR_PENDING_UPLOADS';
}

export interface RetryPendingUploadsMessage {
  action: 'RETRY_PENDING_UPLOADS';
}

// Union type of all message types
export type ExtensionMessage =
  | GetCurrentChatMessage
  | CheckStatusMessage
  | SetAuthTokenMessage
  | SendChatDataMessage
  | OpenDashboardMessage
  | GetAuthStatusMessage
  | LoginMessage
  | LogoutMessage
  | GetSettingsMessage
  | UpdateSettingsMessage
  | ClearPendingUploadsMessage
  | RetryPendingUploadsMessage;

// Helper type to extract action names
export type MessageAction = ExtensionMessage['action'];

// Response types with proper typing
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ExtensionResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Specific response data types
export interface AuthStatusData {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface CheckStatusData {
  isWhatsAppWeb: boolean;
  isLoggedIn: boolean;
  isExtracting: boolean;
}

export interface PendingUploadsData {
  processed: number;
  failed?: number;
  remaining?: number;
}
