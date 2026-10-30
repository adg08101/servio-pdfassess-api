import { ApiError } from '../../../../shared/errors/api-error';

const supportedPatterns = [
  /^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/view.*)?$/,
  /^https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+).*$/,
  /^https:\/\/docs\.google\.com\/uc\?export=download&id=([a-zA-Z0-9_-]+).*$/,
];

export function extractGoogleDriveFileId(url: string): string {
  const normalized = url.trim();
  for (const pattern of supportedPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new ApiError(
    400,
    'UNSUPPORTED_DRIVE_URL',
    'Unsupported Google Drive URL format. Use a direct Drive file-share URL.',
  );
}
