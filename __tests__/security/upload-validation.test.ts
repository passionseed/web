
import { validateFileName } from '@/lib/constants/upload';

describe('File Upload Security', () => {
  const dangerousExtensions = [
    // Executables
    '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.msi',
    '.app', '.deb', '.rpm', '.jar', '.dll', '.so', '.bin',
    '.hta', '.ps1',
    // Scripts
    '.php', '.php3', '.php4', '.php5', '.phps', '.phtml',
    '.pl', '.py', '.sh', '.cgi',
    // Web
    '.html', '.htm', '.shtml', '.xhtml', '.xml', '.svg',
    '.jsp', '.asp', '.aspx'
  ];

  it('should block all dangerous file extensions', () => {
    dangerousExtensions.forEach(ext => {
      const fileName = `malicious_file${ext}`;
      const result = validateFileName(fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not allowed for security reasons');
    });
  });

  it('should block dangerous extensions regardless of case', () => {
    dangerousExtensions.forEach(ext => {
      const fileName = `MALICIOUS_FILE${ext.toUpperCase()}`;
      const result = validateFileName(fileName);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not allowed for security reasons');
    });
  });

  it('should allow safe file extensions', () => {
    const safeExtensions = ['.jpg', '.png', '.pdf', '.txt', '.docx'];

    safeExtensions.forEach(ext => {
      const fileName = `safe_file${ext}`;
      const result = validateFileName(fileName);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should handle filenames with multiple dots correctly', () => {
    const dangerousDoubleExt = 'image.png.php';
    const result = validateFileName(dangerousDoubleExt);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('File type not allowed for security reasons');
  });
});
