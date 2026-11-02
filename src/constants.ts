export const DEFAULT_POPUP_WIDTH = 480;
export const DEFAULT_POPUP_HEIGHT = 640;
export const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const POPUP_POLL_INTERVAL_MS = 300;
export const CODE_VERIFIER_BYTE_LENGTH = 32;
export const STATE_BYTE_LENGTH = 16;
export const NONCE_BYTE_LENGTH = 16;
export const POPUP_WINDOW_NAME = "idp_oauth2_popup";
/**
 * Prefix of `state` values minted by loginWithPopup(). The result of a popup
 * flow must be consumed by the OPENER, which holds the pending flow; a window
 * that lands on redirectUri with a state carrying this prefix is a popup
 * callback window and may only relay. `.` cannot occur in a base64url string,
 * so redirect-flow states (and states minted before this prefix existed) are
 * never mistaken for it.
 */
export const POPUP_STATE_PREFIX = "p.";
export const PENDING_FLOW_STORAGE_PREFIX = "idp_oauth2_pending:";
