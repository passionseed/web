import { toCdnUrl } from "./cdn-url";

describe("toCdnUrl", () => {
  describe("path-style B2 endpoint (S3-style)", () => {
    it("rewrites us-east-005 B2 URL to CDN URL", () => {
      const input =
        "https://pseed-dev.s3.us-east-005.backblazeb2.com/images/test.webp";
      const expected =
        "https://cdn.passionseed.org/images/test.webp";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("rewrites us-west-000 B2 URL to CDN URL", () => {
      const input =
        "https://pseed-dev.s3.us-west-000.backblazeb2.com/submissions/abc/def.jpg";
      const expected =
        "https://cdn.passionseed.org/submissions/abc/def.jpg";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("handles different bucket names", () => {
      const input =
        "https://my-bucket.s3.eu-central-003.backblazeb2.com/docs/report.pdf";
      const expected =
        "https://cdn.passionseed.org/docs/report.pdf";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("handles paths with query strings", () => {
      const input =
        "https://pseed-dev.s3.us-east-005.backblazeb2.com/images/test.webp?x-id=GetObject";
      const expected =
        "https://cdn.passionseed.org/images/test.webp";
      expect(toCdnUrl(input)).toBe(expected);
    });
  });

  describe("virtual-hosted B2 endpoint", () => {
    it("rewrites virtual-hosted B2 URL to CDN URL stripping bucket", () => {
      const input =
        "https://s3.us-east-005.backblazeb2.com/pseed-dev/webtoons/phase1.png";
      const expected =
        "https://cdn.passionseed.org/webtoons/phase1.png";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("handles nested paths in virtual-hosted style", () => {
      const input =
        "https://s3.us-west-000.backblazeb2.com/pseed-dev/submissions/2024/report.pdf";
      const expected =
        "https://cdn.passionseed.org/submissions/2024/report.pdf";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("handles different buckets in virtual-hosted style", () => {
      const input =
        "https://s3.eu-central-003.backblazeb2.com/my-bucket/images/logo.png";
      const expected =
        "https://cdn.passionseed.org/images/logo.png";
      expect(toCdnUrl(input)).toBe(expected);
    });
  });

  describe("friendly B2 endpoint (f005)", () => {
    it("rewrites f005 B2 URL to CDN URL stripping file/bucket", () => {
      const input =
        "https://f005.backblazeb2.com/file/pseed-dev/hackathon/abc.jpg";
      const expected =
        "https://cdn.passionseed.org/hackathon/abc.jpg";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("handles other friendly endpoints like f000", () => {
      const input =
        "https://f000.backblazeb2.com/file/pseed-dev/archive.zip";
      const expected =
        "https://cdn.passionseed.org/archive.zip";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("preserves nested paths", () => {
      const input =
        "https://f005.backblazeb2.com/file/pseed-dev/2024/01/report.pdf";
      const expected =
        "https://cdn.passionseed.org/2024/01/report.pdf";
      expect(toCdnUrl(input)).toBe(expected);
    });
  });

  describe("pass-through cases", () => {
    it("returns already-CDN URLs unchanged", () => {
      const input = "https://cdn.passionseed.org/images/x.jpg";
      expect(toCdnUrl(input)).toBe(input);
    });

    it("returns Supabase Storage URLs unchanged", () => {
      const input = "https://supabase.co/storage/v1/object/avatar.png";
      expect(toCdnUrl(input)).toBe(input);
    });

    it("returns arbitrary external URLs unchanged", () => {
      const input = "https://example.com/image.png";
      expect(toCdnUrl(input)).toBe(input);
    });

    it("returns HTTP URLs unchanged", () => {
      const input = "http://old-site.com/image.jpg";
      expect(toCdnUrl(input)).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(toCdnUrl("")).toBe("");
    });

    it("returns empty string for null input", () => {
      expect(toCdnUrl(null)).toBe("");
    });

    it("returns empty string for undefined input", () => {
      expect(toCdnUrl(undefined)).toBe("");
    });

    it("returns original string for invalid URL", () => {
      const input = "not-a-valid-url";
      expect(toCdnUrl(input)).toBe(input);
    });

    it("handles URL with no path", () => {
      const input = "https://pseed-dev.s3.us-east-005.backblazeb2.com/";
      const expected = "https://cdn.passionseed.org/";
      expect(toCdnUrl(input)).toBe(expected);
    });

    it("handles URL with encoded characters in path", () => {
      const input =
        "https://pseed-dev.s3.us-east-005.backblazeb2.com/images/hello%20world.webp";
      const expected =
        "https://cdn.passionseed.org/images/hello%20world.webp";
      expect(toCdnUrl(input)).toBe(expected);
    });
  });
});
