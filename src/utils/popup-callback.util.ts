import { POPUP_STATE_PREFIX } from "../constants";
import {
  IDP_OAUTH2_MESSAGE_SOURCE,
  type IIdpOAuth2CallbackMessage,
} from "../types";

/** True when `state` was minted by loginWithPopup(), i.e. its pending flow lives in the opener. */
export function isPopupFlowState(state: string | null): boolean {
  return state !== null && state.startsWith(POPUP_STATE_PREFIX);
}

/**
 * Posts the callback params from this window's URL to `window.opener`.
 * Returns false (and posts nothing) when there is no opener, e.g. the page was
 * opened directly rather than as a popup.
 */
export function relayCallbackToOpener(): boolean {
  if (!window.opener) return false;

  const params = new URLSearchParams(window.location.search);
  const message: IIdpOAuth2CallbackMessage = {
    source: IDP_OAUTH2_MESSAGE_SOURCE,
    state: params.get("state"),
    code: params.get("code") ?? undefined,
    error: params.get("error") ?? undefined,
    error_description: params.get("error_description") ?? undefined,
  };

  window.opener.postMessage(message, window.location.origin);
  return true;
}
