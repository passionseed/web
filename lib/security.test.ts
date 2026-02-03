import { sanitizeHtml } from './security';

describe('sanitizeHtml', () => {
  it('should preserve safe HTML', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('should remove script tags', () => {
    const input = '<p>Hello <script>alert("xss")</script>World</p>';
    const expected = '<p>Hello World</p>';
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it('should remove onerror attributes', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const expected = '<img src="x">';
    expect(sanitizeHtml(input)).toBe(expected);
  });

  it('should remove javascript: links', () => {
    const input = '<a href="javascript:alert(1)">Click me</a>';
    const output = sanitizeHtml(input);
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('alert(1)');
  });

  it('should add rel="noopener noreferrer" to target="_blank" links', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('rel="noopener noreferrer"');
      expect(output).toContain('target="_blank"');
  });

  it('should allow simple formatting', () => {
      const input = '<h1>Title</h1><ul><li>Item</li></ul>';
      expect(sanitizeHtml(input)).toBe(input);
  });

  it('should strip iframe tags', () => {
      const input = '<div><iframe src="javascript:alert(1)"></iframe></div>';
      const expected = '<div></div>';
      expect(sanitizeHtml(input)).toBe(expected);
  });
});
