import { sanitizeHtml } from './security';

describe('sanitizeHtml', () => {
  it('should sanitize unsafe HTML', () => {
    const unsafe = '<img src=x onerror=alert(1)>';
    const safe = sanitizeHtml(unsafe);
    expect(safe).toBe('<img src="x">');
  });

  it('should allow safe tags and attributes', () => {
    const safe = '<p class="text-red-500">Hello</p>';
    const result = sanitizeHtml(safe);
    expect(result).toBe(safe);
  });

  it('should allow target and rel attributes for links', () => {
    const link = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>';
    const result = sanitizeHtml(link);
    expect(result).toBe(link);
  });

  it('should allow span tags with class attributes (Prism.js support)', () => {
    const code = '<span class="token keyword">const</span>';
    const result = sanitizeHtml(code);
    expect(result).toBe(code);
  });

  it('should handle non-string input gracefully', () => {
    expect(sanitizeHtml(null as any)).toBe('');
    expect(sanitizeHtml(undefined as any)).toBe('');
  });
});
