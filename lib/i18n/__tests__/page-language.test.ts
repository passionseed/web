import { pageLanguage } from "@/lib/i18n/page-language";

test("most pages are Thai", () => {
  expect(pageLanguage("/")).toEqual({ lang: "th", followsSwitch: false });
  expect(pageLanguage("/hackathon")).toEqual({ lang: "th", followsSwitch: false });
  expect(pageLanguage("/hackathon/join")).toEqual({ lang: "th", followsSwitch: false });
  expect(pageLanguage("/about")).toEqual({ lang: "th", followsSwitch: false });
  expect(pageLanguage(null)).toEqual({ lang: "th", followsSwitch: false });
});

test("measured English pages are English, exact path only", () => {
  expect(pageLanguage("/contact").lang).toBe("en");
  expect(pageLanguage("/hackathon/gallery/").lang).toBe("en");
  expect(pageLanguage("/hackathon/gallery/submit").lang).toBe("th");
});

test("pages on the language switch start English and follow the switch", () => {
  expect(pageLanguage("/expert-interview")).toEqual({ lang: "en", followsSwitch: true });
  expect(pageLanguage("/me/journey")).toEqual({ lang: "en", followsSwitch: true });
  expect(pageLanguage("/metrics").followsSwitch).toBe(false);
});
