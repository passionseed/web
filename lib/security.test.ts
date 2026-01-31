import { sanitizeHtml } from './security';

describe('sanitizeHtml', () => {
  it('should allow safe HTML', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const output = sanitizeHtml(input);
    expect(output).toBe(input);
  });

  it('should strip script tags', () => {
    const input = '<p>Hello <script>alert("xss")</script>World</p>';
    const output = sanitizeHtml(input);
    expect(output).toBe('<p>Hello World</p>');
  });

  it('should strip on* attributes', () => {
    const input = '<p onmouseover="alert(\'xss\')">Hello World</p>';
    const output = sanitizeHtml(input);
    expect(output).toBe('<p>Hello World</p>');
  });

  it('should strip javascript: links', () => {
    const input = '<a href="javascript:alert(\'xss\')">Click me</a>';
    const output = sanitizeHtml(input);
    // output might be <a>Click me</a> or similar depending on implementation
    expect(output).not.toContain('javascript:');
  });
});
