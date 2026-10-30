import { describe, expect, it } from 'vitest';

import { extractGoogleDriveFileId } from '../../src/modules/documents/integrations/drive/drive-url';

describe('extractGoogleDriveFileId', () => {
  it('extracts ID from /file/d/ format', () => {
    const result = extractGoogleDriveFileId(
      'https://drive.google.com/file/d/abc123_DEF-456/view?usp=sharing',
    );
    expect(result).toBe('abc123_DEF-456');
  });

  it('extracts ID from open?id format', () => {
    const result = extractGoogleDriveFileId('https://drive.google.com/open?id=abc123_DEF-456');
    expect(result).toBe('abc123_DEF-456');
  });

  it('throws for unsupported URLs', () => {
    expect(() => extractGoogleDriveFileId('https://example.com/file.pdf')).toThrowError();
  });
});
