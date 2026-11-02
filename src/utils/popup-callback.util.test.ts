import { describe, it, expect, vi, afterEach } from "vitest";
import { POPUP_STATE_PREFIX } from "../constants";
import { IDP_OAUTH2_MESSAGE_SOURCE } from "../types";
import { isPopupFlowState, relayCallbackToOpener } from "./popup-callback.util";

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

describe("isPopupFlowState", () => {
  it("recognises states minted by loginWithPopup()", () => {
    expect(isPopupFlowState(`${POPUP_STATE_PREFIX}abc`)).toBe(true);
  });

  it("rejects null, empty, and redirect-flow (plain base64url) states", () => {
    expect(isPopupFlowState(null)).toBe(false);
    expect(isPopupFlowState("")).toBe(false);
    expect(isPopupFlowState("abcDEF123-_")).toBe(false);
  });

  it("is not fooled by an unprefixed state that merely starts with 'p'", () => {
    // base64url has no '.', so the prefix cannot collide with any unprefixed state
    expect(isPopupFlowState("pQ9x-_8")).toBe(false);
  });
});

describe("relayCallbackToOpener", () => {
  it("returns false and posts nothing when there is no opener", () => {
    vi.stubGlobal("opener", null);
    expect(relayCallbackToOpener()).toBe(false);
  });

  it("posts code/state/error from this window's URL to the opener, scoped to this origin", () => {
    const opener = { postMessage: vi.fn() };
    vi.stubGlobal("opener", opener);
    window.history.pushState(
      {},
      "",
      "/cb?code=c1&state=s1&error=e1&error_description=d1",
    );

    expect(relayCallbackToOpener()).toBe(true);
    expect(opener.postMessage).toHaveBeenCalledWith(
      {
        source: IDP_OAUTH2_MESSAGE_SOURCE,
        state: "s1",
        code: "c1",
        error: "e1",
        error_description: "d1",
      },
      window.location.origin,
    );
  });
});
