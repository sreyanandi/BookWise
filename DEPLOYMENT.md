# 🚀 BookWise Deployment Guide (Option 2: Vercel + Fly.io / Render)

This guide walks through deploying the **BookWise Frontend on Vercel** and the **FastAPI Backend on Fly.io (or Render)** with persistent volume storage for the 7 GB `books.db` database.

---

## Part 1: Deploy Backend to Fly.io

Fly.io provides NVMe-backed persistent volumes which deliver the best performance for SQLite FTS5 searches.

### Step 1.1: Install Fly CLI & Login
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS / Linux
curl -L https://fly.io/install.sh | sh

fly auth login
```

### Step 1.2: Launch the App (without immediate deploy)
From the project root (`bookwise/`):
```bash
fly launch --no-deploy
```
*(Choose an app name, e.g. `bookwise-api-prod`, and select your preferred region).*

### Step 1.3: Create the 10 GB Persistent Volume
Create a 10 GB volume named `bookwise_data`:
```bash
fly volumes create bookwise_data --size 10 --region iad
```

### Step 1.4: Deploy the Backend
```bash
fly deploy
```

### Step 1.5: Upload the `books.db` Database
Copy your 7 GB database from your local machine to the Fly.io volume at `/data/books.db`:
```bash
fly sftp put data/processed/books.db /data/books.db
```

### Step 1.6: Verify Backend Health
Visit your Fly.io API URL in your browser:
`https://<your-app-name>.fly.dev/`
You should see: `{"status":"BookWise API is running", ...}`

---

## Alternative Part 1: Deploy Backend to Render

If you prefer Render:
1. Connect your GitHub repository to [Render.com](https://render.com).
2. Create a **Web Service** using `Docker`.
3. Under **Disks**, attach a persistent disk:
   - **Name**: `bookwise-db`
   - **Mount Path**: `/data`
   - **Size**: `10 GB`
4. Set Environment Variables:
   - `DB_PATH` = `/data/books.db`
   - `ALLOWED_ORIGINS` = `*`
5. Use Render Shell or SSH to upload `books.db` into `/data/books.db`.

---

## Part 2: Deploy Frontend to Vercel

Vercel provides instant global CDN caching and automatic builds on git push.

### Step 2.1: Install Vercel CLI & Login
```bash
npm install -g vercel
vercel login
```

### Step 2.2: Deploy via Vercel CLI or Dashboard
From `frontend/`:
```bash
cd frontend
vercel
```

When prompted:
- **Root Directory**: `frontend` (if deploying from workspace root) or `./` (if inside `frontend`)
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step 2.3: Set Environment Variable
In the **Vercel Project Dashboard** -> **Settings** -> **Environment Variables**:
- **Key**: `VITE_API_URL`
- **Value**: `https://<your-backend-app>.fly.dev` (replace with your Fly.io / Render URL)

Trigger a redeploy (or run `vercel --prod`) to apply the environment variable.

---

## Part 3: Deploying Frontend to Cloudflare Pages (Alternative)

If you use Cloudflare Pages:
1. Go to **Cloudflare Dashboard** -> **Workers & Pages** -> **Create Application** -> **Pages**.
2. Connect your Git repository.
3. Set build settings:
   - **Framework**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://<your-backend-app>.fly.dev`
5. Click **Save and Deploy**.

---

## 🔒 Production CORS Security (Optional)

Once your frontend is live (e.g. `https://bookwise.vercel.app`):
1. Update `ALLOWED_ORIGINS` on Fly.io:
   ```bash
   fly secrets set ALLOWED_ORIGINS="https://bookwise.vercel.app,http://localhost:5173"
   ```
2. Your backend is now locked down to only accept requests from your official website and local dev.
