# PWA Download Page - Setup Checklist

## Prerequisites
- [ ] Node.js installed
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Supabase project active
- [ ] Database access

---

## Step 1: Database Setup ✓

### Option A: Via Supabase Dashboard (Recommended)
- [ ] Log into Supabase
- [ ] Go to SQL Editor
- [ ] Copy-paste content from: `SETUP_PWA_DOWNLOADS_TABLE.sql`
- [ ] Execute the query
- [ ] Verify table created: `pwa_downloads`

### Option B: Via SQL File
```bash
# Execute the SQL file in your database
psql -U postgres -d your_db -f SETUP_PWA_DOWNLOADS_TABLE.sql
```

### Verify Setup
```sql
-- Run this to confirm table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'pwa_downloads';
```

---

## Step 2: Backend API Setup ✓

### Check Routes File
- [ ] Verify `/backend/src/routes/download.routes.ts` exists
- [ ] File contains: `POST /track`, `GET /stats`, `GET /history`

### Check Index Registration
- [ ] Open `/backend/src/index.ts`
- [ ] Verify import: `import downloadRoutes from './routes/download.routes';`
- [ ] Verify registration: `app.use('/api/download', downloadRoutes);`

### Test API Endpoints
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Test endpoints
curl http://localhost:5000/api/download/stats
curl http://localhost:5000/api/download/history

# Should return JSON responses
```

---

## Step 3: Frontend Setup ✓

### Check Files Created
- [ ] `/frontend/app/download/page.tsx` exists
- [ ] `/frontend/lib/usePWAInstall.ts` exists
- [ ] `/frontend/components/PWAPrompt.tsx` exists
- [ ] `/frontend/components/DownloadBanner.tsx` exists

### Verify Providers Updated
- [ ] Open `/frontend/app/providers.tsx`
- [ ] Check import: `import PWAPrompt from '@/components/PWAPrompt';`
- [ ] Check component in render: `<PWAPrompt />`

### Start Frontend
```bash
cd frontend
npm run dev

# Should start on http://localhost:3000
```

---

## Step 4: Test Download Page ✓

### Access Page
- [ ] Navigate to: `http://localhost:3000/download`
- [ ] Page loads without errors
- [ ] Check browser console (F12) - no errors

### Verify Components Render
- [ ] Hero section displays
- [ ] Download button visible
- [ ] Statistics cards show data
- [ ] Features cards display (6 items)
- [ ] Platform guides visible
- [ ] FAQ section renders
- [ ] Footer/CTA section shows

### Check Mobile Responsiveness
- [ ] Open DevTools (F12)
- [ ] Toggle device toolbar (Ctrl+Shift+M)
- [ ] Test at 375px width (mobile)
- [ ] Test at 768px width (tablet)
- [ ] Test at 1920px width (desktop)
- [ ] All sections readable and formatted correctly

---

## Step 5: Test Download Tracking ✓

### Manually Track Download
```bash
curl -X POST http://localhost:5000/api/download/track \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "test-web",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

### Check Stats Updated
```bash
curl http://localhost:5000/api/download/stats
# Should show totalDownloads > 0
```

### Verify in Database
```sql
SELECT * FROM pwa_downloads ORDER BY downloaded_at DESC LIMIT 5;
```

---

## Step 6: Test PWA Installation ✓

### Desktop Browser (Chrome)
- [ ] Visit download page
- [ ] Look for install icon in address bar (or menu)
- [ ] Click install
- [ ] Choose between options
- [ ] App installed

### Mobile Simulation (DevTools)
- [ ] Open DevTools (F12)
- [ ] Application tab → Manifest
- [ ] Verify manifest loads: `/public/manifest.json`
- [ ] Check Service Workers tab
- [ ] Should show registered SW

### Mobile Device Testing
- [ ] Open on Android phone
  - [ ] Chrome browser
  - [ ] Menu → Install app
  - [ ] Follow prompts
- [ ] Open on iPhone
  - [ ] Safari browser
  - [ ] Share → Add to Home Screen
  - [ ] Confirm

---

## Step 7: Test PWA Prompt Component ✓

### Auto-Prompt Feature
- [ ] Open download page
- [ ] Wait 3 seconds
- [ ] Floating prompt should appear (bottom-right)
- [ ] Click "Install Now"
- [ ] Install dialog opens
- [ ] Close/Dismiss button works

### Session Dismissal
- [ ] Dismiss prompt
- [ ] Refresh page
- [ ] Prompt should NOT reappear (session stored)
- [ ] Open in new tab/window
- [ ] Prompt appears again (new session)

---

## Step 8: Test Statistics ✓

### Live Stats Display
- [ ] View download page
- [ ] Check stats cards update
- [ ] Each card shows: Title, Number, Description
- [ ] Stats refresh automatically (60s interval)

### Data Points
- [ ] Total Downloads count
- [ ] Today's Downloads number
- [ ] Last 7 Days count
- [ ] Platform breakdown in community section

### Manual Refresh
- [ ] Open browser DevTools
- [ ] Network tab
- [ ] Click refresh on stats section
- [ ] See `/api/download/stats` request
- [ ] Response contains required fields

---

## Step 9: Test Components Integration ✓

### PWA Prompt in Main App
- [ ] Navigate to any authenticated page
- [ ] Floating prompt should appear (if PWA installable)
- [ ] Prompt respects dismissal across pages
- [ ] Animations work smoothly

### Download Banner (Optional)
- [ ] To test, add to a page:
  ```typescript
  import DownloadBanner from '@/components/DownloadBanner';
  
  <DownloadBanner position="top" dismissible={true} />
  ```
- [ ] Banner appears at top
- [ ] Download link works
- [ ] Dismiss button works

---

## Step 10: Performance Checks ✓

### Page Load Speed
- [ ] Visit `/download`
- [ ] Open DevTools → Lighthouse
- [ ] Run Performance audit
- [ ] Check score (target: 80+)

### API Response Time
```bash
time curl http://localhost:5000/api/download/stats
# Should respond in < 500ms
```

### Database Query Speed
```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM pwa_downloads;
```

---

## Step 11: Security Verification ✓

### Check Headers
```bash
curl -I http://localhost:3000/download
# Should see security headers:
# X-Content-Type-Options
# X-Frame-Options
# X-XSS-Protection
```

### Test CORS
```bash
curl -X OPTIONS http://localhost:5000/api/download/stats \
  -H "Origin: http://localhost:3000"
# Should allow and return proper headers
```

### API Rate Limiting
```bash
# Make multiple requests rapidly
for i in {1..20}; do
  curl http://localhost:5000/api/download/stats &
done
# Should be rate limited or succeed based on config
```

---

## Step 12: Customization (Optional) ✓

### Update App Name
- [ ] Edit `/frontend/public/manifest.json`
- [ ] Change `"name"` and `"short_name"`
- [ ] Change `"description"`

### Update Colors
- [ ] Edit `/frontend/app/download/page.tsx`
- [ ] Search for Tailwind classes: `from-pink-500`, `to-blue-500`
- [ ] Replace with your brand colors

### Update Favicon
- [ ] Replace `/frontend/public/favicon.svg`
- [ ] Update in manifest.json if needed
- [ ] Clear browser cache to see changes

### Customize Features List
- [ ] Edit `features` array in download page
- [ ] Update titles and descriptions
- [ ] Change icons (from lucide-react library)

---

## Final Verification ✓

### Complete Checklist
- [ ] Database table created and accessible
- [ ] Backend API endpoints working
- [ ] Frontend page rendering
- [ ] Download button functional
- [ ] Stats displaying real data
- [ ] PWA install prompt working
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Download tracking working
- [ ] Performance acceptable
- [ ] Security headers present
- [ ] All components integrated

### Production Ready
- [ ] Tested on mobile devices
- [ ] Tested on multiple browsers
- [ ] Stats accumulating properly
- [ ] No memory leaks (DevTools)
- [ ] SEO tags present (Open Graph, etc.)
- [ ] Error handling robust

---

## Troubleshooting

### Stats showing empty
```sql
-- Check if table has data
SELECT COUNT(*) FROM pwa_downloads;

-- Check for errors in logs
tail -f backend/logs/app.log
```

### Install prompt not showing
```typescript
// Check browser support
console.log(window.matchMedia('(display-mode: standalone)').matches);
// Should be false initially, true after install
```

### API not responding
```bash
# Check backend running
curl http://localhost:5000/health

# Check port
lsof -i :5000
```

---

## Next Steps

1. **Promotion**: Add links to download page from key pages
2. **Analytics**: Set up dashboard to monitor stats
3. **Testing**: A/B test different CTAs and designs
4. **Feedback**: Add rating/review section
5. **Enhancement**: Add installation guides per platform

---

## Documentation

- Full guide: `PWA_DOWNLOAD_PAGE_GUIDE.md`
- Quick ref: `PWA_DOWNLOAD_QUICK_REFERENCE.md`
- Code: See `/frontend/app/download/page.tsx`

**Setup complete! Your PWA download page is ready! 🎉**
