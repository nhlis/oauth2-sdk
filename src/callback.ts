import { relayCallbackToOpener } from "./utils/popup-callback.util";

/**
 * Call this on the static page you host at `redirectUri`. It reads
 * `code`/`state`/`error` off the popup's own URL and posts them back to
 * `window.opener`, which closes the popup once it has the message. Does
 * nothing if there is no opener (e.g. page opened directly, not as a popup).
 *
 * `IdpOAuth2Client.handleRedirectCallback()` does the same relay when it runs
 * inside a popup, so a page that calls both is fine, in either order.
 *
 * Usage (redirect_uri page, e.g. /oauth2/callback):
 *   import { handleOAuth2PopupCallback } from 'oauth2-oidc-pkce-client/callback';
 *   handleOAuth2PopupCallback();
 */
export function handleOAuth2PopupCallback(): void {
  relayCallbackToOpener();
}
