# Deploy to Vercel — step by step

## Before you start

- Vercel account (you have one)
- GitHub account (free): https://github.com/signup
- Node.js installed: https://nodejs.org

Project folder: `C:\Users\hamis\global-finance-dashboard`

---

## Part 1 — Put code on GitHub

### 1.1 Create a new repository on GitHub

1. Go to https://github.com/new
2. **Repository name:** `global-finance-dashboard`
3. Leave it **Private** or **Public** (your choice)
4. **Do not** check “Add a README”
5. Click **Create repository**

### 1.2 Upload from your PC (PowerShell)

1. Press **Windows key**, type **PowerShell**, press **Enter**
2. Run these commands one at a time:

```powershell
cd C:\Users\hamis\global-finance-dashboard
git init
git add .
git commit -m "Initial finance dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/global-finance-dashboard.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your real GitHub username.

3. If Git asks you to sign in, follow the browser login (GitHub).

**If `git` is not recognized:** install Git from https://git-scm.com/download/win and try again.

---

## Part 2 — Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click **Add New…** → **Project**
3. Under **Import Git Repository**, click **Import** next to `global-finance-dashboard`  
   - If you don’t see it: click **Adjust GitHub App Permissions** and allow access to the repo
4. **Configure Project** screen:
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** leave as `.`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Expand **Environment Variables** and add:

| Name | Value |
|------|--------|
| `FINNHUB_API_KEY` | Your key from https://finnhub.io/register |
| `FRED_API_KEY` | Your key from https://fred.stlouisfed.org/docs/api/api_key.html |

(Optional — skip keys to run in demo mode.)

6. Click **Deploy**
7. Wait 1–3 minutes until you see **Congratulations**

8. Click **Visit** — your dashboard is live at something like:  
   `https://global-finance-dashboard-xxxx.vercel.app`

---

## Part 3 — API keys (recommended)

1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add `FINNHUB_API_KEY` and `FRED_API_KEY` for **Production**
3. Go to **Deployments** → click **⋯** on latest → **Redeploy**

---

## Part 4 — Custom domain (optional)

1. Vercel project → **Settings** → **Domains**
2. Add e.g. `finance.juniorminingspace.com`
3. Vercel shows DNS records (CNAME)
4. In **DreamHost** panel → DNS for juniorminingspace.com → add that CNAME
5. Wait up to an hour for SSL

---

## Part 5 — Link from WordPress

1. WordPress admin → **Appearance** → **Menus**
2. Add **Custom Link**:
   - URL: your Vercel URL (or custom domain)
   - Text: `Finance Dashboard`
3. **Save Menu**

Or edit home page button **Market Data →** to that URL.

---

## Updating later

After you change code in Cursor:

```powershell
cd C:\Users\hamis\global-finance-dashboard
git add .
git commit -m "Describe your change"
git push
```

Vercel redeploys automatically.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build failed on Vercel | Open deployment → **Building** log; often missing `npm` deps — ensure `package.json` is committed |
| All metrics say “Demo” | Add `FINNHUB_API_KEY` on Vercel and redeploy |
| 404 on refresh | `vercel.json` is included — redeploy |
