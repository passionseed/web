import { inAppBrowser, lineExternalUrl } from "../share";

describe("Elemental quiz sharing", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101", "instagram"],
    ["Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 357.0.0.25.101 Android", "instagram"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]", "facebook"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.19.0", "line"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 trill_350000 BytedanceWebview/d8a21c6", "tiktok"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36", "webview"],
  ])("knows where it's open: %s", (ua, app) => {
    expect(inAppBrowser(ua)).toBe(app);
  });

  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  ])("treats a real browser as a real browser: %s", (ua) => {
    expect(inAppBrowser(ua)).toBeNull();
  });

  it("asks LINE to open the same page in the phone's browser, keeping its query", () => {
    expect(lineExternalUrl("https://passionseed.org/hackathon/elemental/quiz/fire?me=1")).toBe(
      "https://passionseed.org/hackathon/elemental/quiz/fire?me=1&openExternalBrowser=1",
    );
  });
});
