# Complete GitHub Repository Setup Guide for AKV Project

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create GitHub Repository](#create-github-repository)
3. [Choose .gitignore](#choose-gitignore)
4. [Local Git Setup](#local-git-setup)
5. [Connect to Remote Repository](#connect-to-remote-repository)
6. [Initial Commit & Push](#initial-commit--push)
7. [Avoid Repository Conflicts](#avoid-repository-conflicts)
8. [Verify Setup](#verify-setup)

---

## Prerequisites

### Required Software
- Git installed on your machine ([Download Git](https://git-scm.com/download/win))
- GitHub account ([Create account](https://github.com/signup))
- Text editor or VS Code

### Verify Git Installation
Open PowerShell and run:
```powershell
git --version
git config --global user.name
git config --global user.email
```

### Set Global Git Configuration (if not done)
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Create GitHub Repository

### Step 1: Go to GitHub
1. Open [github.com](https://github.com)
2. Sign in to your account

### Step 2: Create New Repository
1. Click **+** icon (top-right corner)
2. Select **New repository**
3. Or visit: https://github.com/new

### Step 3: Repository Configuration

**Repository Name:**
- Name: `akv-sales-management` (or similar)
- This identifies your project on GitHub

**Repository Description:**
```
AKV Sales Management System - Staff Commission Tracking, Inventory Management, 
and Payment Processing with Supabase Backend and Next.js Frontend
```

**Visibility:**
- Choose **Private** (only you/selected team can see)
- Or **Public** (visible to everyone) - your choice

**Initialize this repository with:**
- ❌ **Do NOT check:** "Add a README file"
- ❌ **Do NOT check:** "Add .gitignore"
- ❌ **Do NOT check:** "Choose a license"

*Note: We'll do these locally instead*

### Step 4: Create Repository
- Click **Create repository**
- Copy the HTTPS URL shown on the next page
- Example: `https://github.com/yourusername/akv-sales-management.git`

---

## Choose .gitignore

### What is .gitignore?
A `.gitignore` file tells Git which files/folders to **exclude from version control**. This prevents:
- Node modules (huge, auto-generated)
- Environment secrets (.env files)
- Build artifacts
- IDE settings
- OS-specific files

### For AKV Project Tech Stack

Your project uses:
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** Next.js + React
- **Database:** Supabase
- **Environment:** Windows/VS Code

### Recommended .gitignore Content

Create a file named `.gitignore` in your project root with this content:

```gitignore
# ============================================================================
# DEPENDENCIES & MODULES
# ============================================================================
node_modules/
node_modules
/.pnp
.pnp.js
yarn.lock
package-lock.json

# ============================================================================
# BUILD & DIST
# ============================================================================
dist/
dist
build/
build
.next/
.next
out/
.vercel
*.tsbuildinfo

# ============================================================================
# ENVIRONMENT VARIABLES (CRITICAL - DO NOT COMMIT)
# ============================================================================
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local
.env.secrets
.supabase/

# ============================================================================
# IDE & EDITOR SETTINGS
# ============================================================================
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
*.sublime-workspace
.sublime-project
.eslintcache

# ============================================================================
# RUNTIME & LOGS
# ============================================================================
*.log
*.logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# ============================================================================
# TESTING & COVERAGE
# ============================================================================
coverage/
.nyc_output/
.jest_cache/
.mocha_cache/

# ============================================================================
# OS SPECIFIC
# ============================================================================
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
.AppleDouble
.LSOverride

# ============================================================================
# TEMPORARY & BACKUP FILES
# ============================================================================
*.tmp
*.bak
*.swp
*.swo
~*
.#*
*~

# ============================================================================
# DATABASE & LOCAL DATA
# ============================================================================
*.db
*.sqlite
*.sqlite3
data/
local_data/

# ============================================================================
# DOCUMENTATION BUILDS
# ============================================================================
docs/_build/
site/

# ============================================================================
# MISC & PROJECT SPECIFIC
# ============================================================================
.cache/
dist-ssr/
*.egg-info/
.pytest_cache/
.eslintignore
```

---

## Local Git Setup

### Step 1: Open PowerShell in Project Directory
```powershell
# Navigate to your project
cd "c:\Users\LuckyGold\Desktop\AKV"
```

### Step 2: Check Current Status
```powershell
# Check if git is already initialized
ls -la
```

**If you see a `.git` folder:** Git is already initialized (skip to Step 4)

**If no `.git` folder:** Continue with Step 3

### Step 3: Initialize Git Repository
```powershell
git init
```

Expected output:
```
Initialized empty Git repository in C:/Users/LuckyGold/Desktop/AKV/.git/
```

### Step 4: Create .gitignore File
Create `.gitignore` in the project root:

**Using PowerShell:**
```powershell
# Create the file with content
$gitignoreContent = @"
# Dependencies & Modules
node_modules/
/.pnp
.pnp.js
yarn.lock
package-lock.json

# Build & Dist
dist/
build/
.next/
out/
.vercel

# Environment Variables
.env
.env.local
.env.*.local
.supabase/

# IDE & Editor
.vscode/
.idea/
*.swp

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
"@

Set-Content -Path ".gitignore" -Value $gitignoreContent
```

**Or using VS Code:**
1. Right-click in VS Code Explorer → New File
2. Name it `.gitignore`
3. Paste the content from the recommended list above
4. Save (Ctrl+S)

### Step 5: Verify .gitignore Creation
```powershell
# Check if file exists
Get-Content .gitignore | Select-Object -First 10
```

---

## Connect to Remote Repository

### Step 1: Add Remote Origin
```powershell
# Replace URL with your GitHub repository URL
git remote add origin https://github.com/yourusername/akv-sales-management.git
```

**Get your URL from GitHub:**
1. Go to your repository on GitHub
2. Click **Code** (green button)
3. Select **HTTPS**
4. Copy the URL

### Step 2: Verify Remote Connection
```powershell
git remote -v
```

Expected output:
```
origin  https://github.com/yourusername/akv-sales-management.git (fetch)
origin  https://github.com/yourusername/akv-sales-management.git (push)
```

---

## Initial Commit & Push

### Step 1: Check Git Status
```powershell
git status
```

This shows files ready to be committed.

### Step 2: Add All Files
```powershell
# Add all files (respects .gitignore)
git add .
```

Verify what will be committed:
```powershell
git status
```

### Step 3: Create Initial Commit
```powershell
git commit -m "Initial commit: AKV Sales Management System with commission tracking"
```

**Good commit message format:**
- Present tense: "Add feature" not "Added feature"
- Describe what changed
- Be specific

### Step 4: Rename Branch (if needed)
```powershell
# Check current branch
git branch

# If on 'master', rename to 'main' (GitHub default)
git branch -M main
```

### Step 5: Push to GitHub
```powershell
git push -u origin main
```

First time push requires `-u` flag to set upstream.

**Expected output:**
```
Enumerating objects: 150, done.
Counting objects: 100% (150/150), done.
Delta compression using up to 8 threads
Compressing objects: 100% (120/120), done.
Writing objects: 100% (150/150), 2.5 MiB | 1.2 MiB/s, done.
...
To https://github.com/yourusername/akv-sales-management.git
 * [new branch]      main -> main
Branch 'main' set to track remote branch 'main' from 'origin'.
```

### Step 6: Verify on GitHub
1. Go to your GitHub repository
2. Refresh the page
3. Your files should now be visible

---

## Avoid Repository Conflicts

### Problem: Multiple Git Projects
You have:
- Other projects in different repos
- New AKV project
- Risk of pushing to wrong repo

### Solution: Maintain Separate Repositories

#### ✅ Best Practice #1: Different Folders
```
c:\Users\LuckyGold\Desktop\
├── AKV/                    ← This project (git init here)
│   ├── .git/
│   ├── backend/
│   ├── frontend/
│   └── .gitignore
├── OtherProject/           ← Different project (separate repo)
│   ├── .git/
│   └── .gitignore
└── AnotherProject/         ← Different project (separate repo)
    ├── .git/
    └── .gitignore
```

**Key Rule:** Each project folder has its own `.git/` directory

#### ✅ Best Practice #2: Verify Before Pushing
Before any push, always run:
```powershell
# Check which directory you're in
pwd

# Check git remote
git remote -v

# Check git status
git status
```

#### ✅ Best Practice #3: Use Different Remotes
```powershell
# Add remotes with descriptive names
git remote add origin-akv https://github.com/yourusername/akv-sales-management.git
git remote add origin-other https://github.com/yourusername/other-project.git

# Push to specific remote
git push -u origin-akv main
git push -u origin-other main
```

#### ✅ Best Practice #4: Never Remove .git from Wrong Folder
```powershell
# WRONG - Don't do this accidentally!
rm -r .git  # This removes version control from current project

# Check what .git exists in parent directories
Get-Item -Path ".\.git" -ErrorAction SilentlyContinue
```

---

## Verify Setup

### Checklist
Run these commands in PowerShell from `c:\Users\LuckyGold\Desktop\AKV`:

#### ✅ 1. Git Initialized
```powershell
git status
```
Should show: `On branch main`

#### ✅ 2. Remote Connected
```powershell
git remote -v
```
Should show your GitHub URL

#### ✅ 3. .gitignore Respected
```powershell
# Check if node_modules are ignored
git status --ignored | Select-String "node_modules"
```

#### ✅ 4. Files Committed
```powershell
git log --oneline
```
Should show your initial commit

#### ✅ 5. Pushed to GitHub
```powershell
git push
# Should say "Everything up-to-date" or push new changes
```

#### ✅ 6. GitHub Visibility
1. Go to your repository on GitHub
2. Files should be visible
3. Check that `node_modules/` is NOT listed (ignored by .gitignore)

---

## Quick Reference Commands

### Daily Workflow
```powershell
# Verify you're in correct project
pwd

# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### Common Tasks

**See commit history:**
```powershell
git log --oneline --graph --all
```

**Undo last commit (before push):**
```powershell
git reset --soft HEAD~1
```

**Undo last commit (after push - careful!):**
```powershell
git revert HEAD
git push
```

**Switch between projects safely:**
```powershell
# Project 1
cd "c:\Users\LuckyGold\Desktop\AKV"
git status

# Project 2
cd "c:\Users\LuckyGold\Desktop\OtherProject"
git status
```

---

## Next Steps After Initial Setup

1. **Create .gitignore (if not done)** ✓
2. **Push initial commit** ✓
3. **For backend development:**
   ```powershell
   cd backend
   npm install
   npm run build
   npm start
   ```

4. **For frontend development:**
   ```powershell
   cd frontend
   npm install
   npm run build
   npm start
   ```

5. **After making changes:**
   ```powershell
   git add .
   git commit -m "Feature: Add commission tracking"
   git push
   ```

---

## Troubleshooting

### Issue: "fatal: not a git repository"
**Solution:**
```powershell
git init
git remote add origin https://github.com/yourusername/akv-sales-management.git
```

### Issue: "Permission denied" when pushing
**Solution:**
```powershell
# Use SSH instead of HTTPS (requires SSH key setup)
# Or use GitHub Personal Access Token instead of password
```

### Issue: ".env file committed accidentally"
**Solution:**
```powershell
# Remove from git history
git rm --cached .env
git commit -m "Remove .env from tracking"
git push

# Add to .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push
```

### Issue: Pushed to wrong repository
**Solution:**
```powershell
# Check remote
git remote -v

# Remove wrong remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/yourusername/correct-repo.git
git push -u origin main
```

---

## Security Best Practices

⚠️ **CRITICAL - Protect Your Secrets:**

✅ **DO:**
- Add `.env` to `.gitignore`
- Add `.supabase/` to `.gitignore`
- Never commit passwords, API keys, or tokens
- Use environment variables for secrets

❌ **DON'T:**
- Commit `.env` files
- Commit API keys or tokens
- Make private credentials public
- Push database credentials

### If Secrets Were Committed
```powershell
# Immediately rotate all compromised credentials
# Remove from git history (advanced)
# Use tools like BFG Repo-Cleaner if needed
```

---

## Summary

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `git init` | Initialize repository |
| 2 | Create `.gitignore` | Exclude sensitive files |
| 3 | `git remote add origin <URL>` | Connect to GitHub |
| 4 | `git add .` | Stage files |
| 5 | `git commit -m "message"` | Create commit |
| 6 | `git push -u origin main` | Push to GitHub |

You're all set! Your AKV project is now on GitHub with proper configuration. ✅

---

**Date Created:** February 7, 2026
**Last Updated:** February 7, 2026
