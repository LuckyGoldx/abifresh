# 🚨 SECURITY AUDIT - QUICK ACTION ITEMS
## ABIFRESH & KIDDIES VENTURES - Priority Fixes

**Created:** February 27, 2026

---

## 🔴 CRITICAL - FIX IMMEDIATELY (This Week)

### 1️⃣ Rotate All Secrets (Est. 30 min)
```bash
# In Supabase Dashboard:
# 1. Go to Settings > API
# 2. Click "Regenerate" on ANON_KEY
# 3. Click "Regenerate" on SERVICE_ROLE_KEY
# 4. Copy new keys

# In your local .env:
SUPABASE_ANON_KEY=<new_key>
SUPABASE_SERVICE_ROLE_KEY=<new_key>

# Redeploy backend with new keys
```
**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** TODAY

---

### 2️⃣ Remove Exposed Credentials from Repo (Est. 15 min)
```bash
# Delete these files:
rm ADMIN_CREDENTIALS.md
rm TEST_CREDENTIALS.md  
rm DEMO_CREDENTIALS.txt

# Or edit files to remove all passwords
# Files affected:
# - ADMIN_CREDENTIALS.md (keep structure, remove passwords)
# - TEST_CREDENTIALS.md (keep structure, remove passwords)
# - DEMO_CREDENTIALS.txt

git add -A
git commit -m "security: remove exposed credentials"
git push origin main

# Then audit git history:
git log --all --source -- ADMIN_CREDENTIALS.md
```
**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** TODAY

---

### 3️⃣ Generate New JWT_SECRET (Est. 10 min)
```bash
# Generate secure random key:
openssl rand -base64 32
# Output: XxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXX

# Update in backend/.env:
JWT_SECRET=XxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXX

# Redeploy backend
# Note: All users will need to re-login
```
**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** TODAY

---

### 4️⃣ Change All Test Passwords (Est. 20 min)
**In Supabase Dashboard > Authentication > Users:**

Force password reset for:
- admin@abifresh.com
- sales@abifresh.com
- seller@abifresh.com
- staff.comm@abifresh.com
- staff@abifresh.com

**New passwords should be:**
- Minimum 15 characters
- Include: Uppercase, lowercase, numbers, symbols
- Unique for each user
- Stored securely (password manager only)

**Or send password reset emails:**
```typescript
// backend implementation to add later
await sendPasswordResetEmail(user.email);
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** TODAY

---

### 5️⃣ Remove Plain Text Passwords from Code (Est. 10 min)
**File:** `backend/src/services/localhost-auth.service.ts`

**Option A: Delete the file (if not used)**
```bash
rm backend/src/services/localhost-auth.service.ts
# Also remove from imports
```

**Option B: Add production guard:**
```typescript
// At top of file
if (process.env.NODE_ENV === 'production') {
  throw new Error('Localhost auth service cannot be used in production!');
}
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** BY END OF WEEK

---

## 🟠 HIGH - Fix This Sprint (1-2 weeks)

### 6️⃣ Add Password Validation (Est. 1 hour)
**Create:** `backend/src/utils/password-validator.ts`

```typescript
export const validatePasswordStrength = (password: string) => {
  const errors: string[] = [];
  
  if (password.length < 12) errors.push('Min 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('Need uppercase');
  if (!/[a-z]/.test(password)) errors.push('Need lowercase');
  if (!/\d/.test(password)) errors.push('Need numbers');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Need special char');
  
  return { valid: errors.length === 0, errors };
};
```

**Update routes:**
- `backend/src/routes/auth.routes.ts` - change-password
- `backend/src/routes/admin.routes.ts` - staff/create

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** SPRINT END

---

### 7️⃣ Add Helmet Security Headers (Est. 30 min)
**Update:** `backend/src/index.ts`

```typescript
import helmet from 'helmet';

// Add before CORS
app.use(helmet());

// Or with custom config:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, preload: true },
  frameguard: { action: 'deny' }
}));
```

**Test:**
```bash
curl -I http://localhost:5000/health
# Look for X-Frame-Options, Strict-Transport-Security, etc.
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** SPRINT END

---

### 8️⃣ Add Rate Limiting (Est. 1 hour)
**Install:**
```bash
npm install express-rate-limit
```

**Create:** `backend/src/middleware/ratelimit.ts`

```typescript
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts',
  skipSuccessfulRequests: true
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

**Update routes:**
```typescript
// backend/src/routes/auth.routes.ts
router.post('/login', loginLimiter, async (req, res) => { ... });

// backend/src/index.ts
app.use('/api', generalLimiter);
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** SPRINT END

---

### 9️⃣ Remove Sensitive Data from Logs (Est. 1 hour)
**Search for:**
```bash
grep -r "console.log" backend/src/ | grep -E "(password|token|payment|email)"
```

**Remove or sanitize:**
```typescript
// ❌ BAD
console.log('Payment data:', payment);

// ✅ GOOD
logger.info('Payment processed', { id: payment.id });
```

**Create:** `backend/src/utils/logger.ts`

```typescript
const sensitiveFields = ['password', 'token', 'secret', 'email', 'amount'];

function sanitize(data: any) {
  // Replace sensitive fields with ***REDACTED***
}

export const logger = {
  info: (msg, data) => console.log(msg, sanitize(data))
};
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** SPRINT END

---

### 🔟 Add Input Validation (Est. 2 hours)
**Install:**
```bash
npm install express-validator
```

**Create validation middleware and apply to all routes that accept input**

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** END OF SPRINT

---

## 🟡 MEDIUM - Complete Next Sprint (2-4 weeks)

### 1️⃣1️⃣ Migrate to HttpOnly Cookies (Est. 4 hours)
- Replace localStorage token with httpOnly cookie
- Update backend to set cookie on login
- Remove token from API requests (use cookie)
- Add CSRF protection

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** NEXT SPRINT

---

### 1️⃣2️⃣ Add CSRF Protection (Est. 1.5 hours)
```bash
npm install csurf cookie-parser
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** NEXT SPRINT

---

### 1️⃣3️⃣ Remove Default Values from Code (Est. 30 min)
**Files to update:**
- `backend/src/middleware/auth.ts` - Remove fallback JWT_SECRET
- `backend/src/config/supabase.ts` - Add error if env vars missing

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** NEXT SPRINT

---

### 1️⃣4️⃣ Add Request Size Limits (Est. 20 min)
```typescript
// backend/src/index.ts
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
```

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** NEXT SPRINT

---

### 1️⃣5️⃣ Implement API Versioning (Est. 1 hour)
- Change routes from `/api/...` to `/api/v1/...`
- Update frontend API_URL

**Status:** ⏳ Not Started  
**Owner:** [Assign person]  
**Deadline:** NEXT SPRINT

---

## 🔵 LOW - Plan for Later

- [ ] Implement CSP headers
- [ ] Create incident response documentation
- [ ] Set up security monitoring (Sentry, DataDog)
- [ ] Add security scanning in CI/CD
- [ ] Plan penetration testing

---

## ✅ VERIFICATION CHECKLIST

After each fix, verify with:

### Secrets Rotation
- [ ] `git log --all -- backend/.env` shows no secrets
- [ ] New JWT_SECRET in use
- [ ] Supabase keys regenerated

### Password Validation
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak","full_name":"Test","role":"sales"}'
# Should reject password "weak"
```

### Helmet Headers
```bash
curl -I http://localhost:5000/health | grep -E "(X-Frame-Options|Strict-Transport)"
# Should see security headers
```

### Rate Limiting
```bash
# Make 6 requests rapidly to login
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done
# 6th request should be rate limited
```

### No Sensitive Logs
```bash
grep -r "console.log.*password\|console.log.*token\|console.log.*payment" backend/src/
# Should return nothing
```

---

## 📊 Progress Tracking

| Task | Owner | Status | Start | End | Notes |
|------|-------|--------|-------|-----|-------|
| Rotate secrets | | ⏳ | | | URGENT |
| Remove credentials | | ⏳ | | | |
| Generate JWT | | ⏳ | | | |
| Change passwords | | ⏳ | | | |
| Remove code passwords | | ⏳ | | | |
| Add validation | | ⏳ | | | |
| Add helmet | | ⏳ | | | |
| Add rate limit | | ⏳ | | | |
| Remove log data | | ⏳ | | | |
| Add input validation | | ⏳ | | | |
| HttpOnly cookies | | ⏳ | | | |
| CSRF protection | | ⏳ | | | |
| Remove defaults | | ⏳ | | | |
| Size limits | | ⏳ | | | |
| API versioning | | ⏳ | | | |

---

## 🎯 Success Criteria

Your system is secure when:
1. ✅ All secrets rotated (no original values in use)
2. ✅ No credentials in repository
3. ✅ Passwords 12+ chars with complexity
4. ✅ Helmet headers present in responses
5. ✅ Rate limiting working on login
6. ✅ No sensitive data in logs
7. ✅ All inputs validated on backend
8. ✅ Tests pass including security tests

---

## 🔗 Related Documents
- See: `SECURITY_AUDIT_REPORT.md` - Full detailed audit
- See: `DEPLOYMENT_AND_COMPREHENSIVE_ANALYSIS.md` - Architecture notes
- See: `backend/.env.example` - Update with no actual values

---

**Last Updated:** February 27, 2026  
**Status:** ⚠️ ACTION REQUIRED

