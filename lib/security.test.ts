import { sanitizeHtml } from './security';

describe('sanitizeHtml', () => {
  it('should sanitize script tags', () => {
    const input = '<script>alert("xss")</script>';
    expect(sanitizeHtml(input)).toBe('');
  });

  it('should sanitize onclick attributes', () => {
    const input = '<button onclick="alert(\'xss\')">Click me</button>';
    expect(sanitizeHtml(input)).toBe('<button>Click me</button>');
  });

  it('should keep safe html', () => {
    const input = '<b>Bold</b>';
    expect(sanitizeHtml(input)).toBe('<b>Bold</b>');
  });

  it('should sanitize javascript: links', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    expect(sanitizeHtml(input)).toBe('<a>Link</a>');
  });
});
