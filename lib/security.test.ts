import { sanitizeHtml } from './security';

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const malicious = '<script>alert("xss")</script>Hello';
    expect(sanitizeHtml(malicious)).toBe('Hello');
  });

  it('should remove onclick handlers', () => {
    const malicious = '<button onclick="alert(1)">Click me</button>';
    expect(sanitizeHtml(malicious)).toBe('<button>Click me</button>');
  });

  it('should preserve allowed tags and attributes', () => {
    const safe = '<span class="highlight">Code</span>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it('should preserve basic formatting tags', () => {
    const safe = '<b>Bold</b> <i>Italic</i> <p>Paragraph</p>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });
});
