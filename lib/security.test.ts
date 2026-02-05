import { sanitizeHtml } from './security';

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const output = sanitizeHtml(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('Hello');
  });

  it('removes onclick handlers', () => {
    // a is allowed, onclick is not
    const input = '<a href="#" onclick="alert(1)">Link</a>';
    const output = sanitizeHtml(input);
    expect(output).not.toContain('onclick');
    expect(output).toContain('Link');
  });

  it('preserves class attributes (for Prism)', () => {
    const input = '<span class="token keyword">const</span>';
    const output = sanitizeHtml(input);
    expect(output).toBe(input);
  });

  it('preserves standard formatting', () => {
    const input = '<b>Bold</b> <i>Italic</i> <p>Para</p>';
    const output = sanitizeHtml(input);
    expect(output).toBe(input);
  });

  it('handles empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('removes iframe', () => {
      const input = '<iframe src="javascript:alert(1)"></iframe>';
      const output = sanitizeHtml(input);
      expect(output).toBe('');
  });

  it('allows images', () => {
      const input = '<img src="valid.jpg" alt="test" />';
      const output = sanitizeHtml(input);
      expect(output).toContain('<img');
      expect(output).toContain('src="valid.jpg"');
  });
});
