# SmartBank Deployment Guide

Follow these steps to host your SmartBank application on the internet for free using **Render** and **Vercel**.

## Prerequisites
1. A [GitHub](https://github.com) account.
2. A [Render](https://render.com) account.
3. A [Vercel](https://vercel.com) account.
4. Your GitHub repository URL where the code is pushed.

---

## Part 1: Host Backend on Render

1. **Login to Render** and click **New +** > **Blueprint**.
2. **Connect your GitHub** and select your `BANKING-SYSTEM` repository.
3. Render will detect the `backend/render.yaml` file.
4. **Branch**: Select **`main`**.
4. **Configure Environment Variables**:
   In the Render dashboard, go to **Environment** and add the variables from your `smartbank_credentials.txt` file (find this in your project root).
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SMTP_PASSWORD` (and others...)
5. **Deploy**: Render will start the backend. Once it is "Live", copy the URL (e.g., `https://smartbank-api.onrender.com`).

---

## Part 2: Host Frontend on Vercel

1. **Login to Vercel** and click **Add New** > **Project**.
2. **Import your GitHub repository**.
3. **Configure Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
4. **Add Environment Variables**:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: (Paste your Render Backend URL here, e.g., `https://smartbank-api.onrender.com`)
5. **Deploy**: Vercel will build and host your site. You will get a final URL (e.g., `https://smartbank.vercel.app`).

---

## Part 3: Update Supabase (Final Step)

1. Go to your **Supabase Dashboard** > **Authentication** > **URL Configuration**.
2. **Site URL**: Paste your Vercel URL here.
3. **Redirect URLs**: Add your Vercel URL to the list.

---

### Need Help?
If you see any "Internal Server Error" or "404", check the logs in the Render or Vercel dashboard. I am always ready to help you if you get stuck!
