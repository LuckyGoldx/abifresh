# Download Page URL Configuration Guide

## Overview
The download page is configured to work seamlessly across different environments:
- **Local Development**: `http://localhost:3000/download`
- **Live Vercel Deployment**: `https://abifresh.vercel.app/download`

## Environment Configuration Files

### `.env.local` (Development)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DOWNLOAD_PAGE=/download
```

### `.env.production` (Vercel Production)
```env
NEXT_PUBLIC_APP_URL=https://abifresh.vercel.app
NEXT_PUBLIC_DOWNLOAD_PAGE=https://abifresh.vercel.app/download
```

## File Structure
The download page component is located at:
```
frontend/app/download/page.tsx
```

Next.js automatically routes this to:
- Local: `http://localhost:3000/download`
- Production: `https://abifresh.vercel.app/download`

## Usage in Code

### Using URL Configuration Helper
Import the URL helper functions from `lib/urlConfig.ts`:

```typescript
import { getDownloadPageUrl, getDownloadPageAbsoluteUrl, config } from '@/lib/urlConfig';

// Get relative URL (good for local navigation)
const relativeUrl = getDownloadPageUrl(); // '/download'

// Get absolute URL (includes domain)
const absoluteUrl = getDownloadPageAbsoluteUrl(); 
// Development: 'http://localhost:3000/download'
// Production: 'https://abifresh.vercel.app/download'

// Use in navigation
window.location.href = getDownloadPageUrl(); // Redirects to /download

// Use config object
console.log(config.app.downloadPageAbsolute); // Full URL
```

### Direct Navigation
For simple navigation within the app, use relative paths:

```typescript
// In Next.js components
import Link from 'next/link';

<Link href="/download">Download App</Link>

// In client-side navigation
window.location.href = '/download';
window.location.pathname = '/download';
```

## Environment Variables Reference

| Variable | Local Value | Production Value | Purpose |
|----------|-------------|------------------|---------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://abifresh.vercel.app` | Application base URL |
| `NEXT_PUBLIC_DOWNLOAD_PAGE` | `/download` | `https://abifresh.vercel.app/download` | Download page path/URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` | Backend API URL | API server endpoint |

## Page Details

### Download Page Component
**Location**: `/frontend/app/download/page.tsx`
**Route**: `/download`
**Status**: ✅ Accessible at both local and production URLs

### Key Features
- Beautiful UI with download button
- Download statistics tracking
- PWA installation prompt
- Auto-redirect to homepage after successful install
- Responsive design (mobile & desktop)

## Redirects from Download Page

After successful installation, the page redirects to:
```typescript
// This works in both environments
window.location.href = '/'; // Redirects to homepage
```

## Testing URLs

### Local Development
- Main app: `http://localhost:3000`
- Download page: `http://localhost:3000/download`

### Production (Vercel)
- Main app: `https://abifresh.vercel.app`
- Download page: `https://abifresh.vercel.app/download`

## Deployment Verification

After deploying to Vercel, verify:
1. ✅ Download page loads: `https://abifresh.vercel.app/download`
2. ✅ Download button works
3. ✅ Stats are tracked in Supabase
4. ✅ Redirect to homepage works after install
5. ✅ Responsive on mobile and desktop

## Updating API URLs

If you change your backend API domain:
1. Update `NEXT_PUBLIC_API_URL` in `.env.production`
2. Update `NEXT_PUBLIC_API_URL` in `.env.local`
3. Redeploy to Vercel

Example:
```env
# For production API
NEXT_PUBLIC_API_URL=https://api.abifresh.com
```

## Notes

- The download page component uses relative URLs (`/download`) for navigation
- Environment variables are automatically loaded by Next.js based on the environment
- `.env.local` is used during development (`npm run dev`)
- `.env.production` is used during Vercel deployment
- No additional configuration needed for URL routing - Next.js handles it automatically
