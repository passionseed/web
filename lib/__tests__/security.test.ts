import { sanitizeHtml } from '../security';

describe('sanitizeHtml', () => {
  it('should return empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should preserve safe HTML', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('should remove script tags', () => {
    const html = '<p>Hello <script>alert("xss")</script>World</p>';
    expect(sanitizeHtml(html)).toBe('<p>Hello World</p>');
  });

  it('should remove inline event handlers', () => {
    const html = '<img src="x" onerror="alert(\'xss\')">';
    expect(sanitizeHtml(html)).toBe('<img src="x">');
  });

  it('should remove javascript: hrefs', () => {
    const html = '<a href="javascript:alert(1)">Click me</a>';
    expect(sanitizeHtml(html)).toBe('<a>Click me</a>');
  });

  it('should handle complex nesting', () => {
    const html = '<div><p>Test <span onmouseover="alert(1)">span</span></p></div>';
    expect(sanitizeHtml(html)).toBe('<div><p>Test <span>span</span></p></div>');
  });
});
