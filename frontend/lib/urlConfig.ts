/**
 * Application URL Configuration Helper
 * Provides consistent access to app URLs across environments
 */

export const getAppUrl = (): string => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export const getDownloadPageUrl = (): string => {
  return process.env.NEXT_PUBLIC_DOWNLOAD_PAGE || '/download';
};

export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

/**
 * Get absolute URL for a path
 * In development (/download -> http://localhost:3000/download)
 * In production (/download -> https://abifresh.vercel.app/download)
 */
export const getAbsoluteUrl = (path: string): string => {
  const baseUrl = getAppUrl();
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

/**
 * Get download page absolute URL
 * Returns relative path in development, absolute URL in production
 */
export const getDownloadPageAbsoluteUrl = (): string => {
  const downloadPage = getDownloadPageUrl();
  // If it's already an absolute URL (contains http), return as is
  if (downloadPage.startsWith('http')) {
    return downloadPage;
  }
  // Otherwise, get absolute URL based on environment
  return getAbsoluteUrl(downloadPage);
};

export const config = {
  app: {
    url: getAppUrl(),
    downloadPage: getDownloadPageUrl(),
    downloadPageAbsolute: getDownloadPageAbsoluteUrl(),
  },
  api: {
    url: getApiUrl(),
  },
};
