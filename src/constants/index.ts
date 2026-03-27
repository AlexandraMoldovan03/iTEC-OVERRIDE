/**
 * src/constants/index.ts
 * Central re-export for all app constants.
 */

export * from './teams';
export * from './tools';

export const APP_NAME = 'MuralWar';
export const APP_VERSION = '0.1.0';

/** AsyncStorage key for persisted auth token */
export const STORAGE_KEY_AUTH_TOKEN = '@muralwar/auth_token';
/** AsyncStorage key for persisted user object */
export const STORAGE_KEY_USER = '@muralwar/user';
/** AsyncStorage key for scanned poster history */
export const STORAGE_KEY_VAULT = '@muralwar/vault';

/** Mock WebSocket reconnect delay in ms */
export const WS_RECONNECT_DELAY = 3000;
/** Simulated WS broadcast interval for mock events */
export const MOCK_WS_INTERVAL_MS = 4000;
