# 🚀 Deployment Guide: Sports Week Score App

This guide will help you deploy your application for free using **Vercel** (Frontend), **Render** (Backend), and **Neon** (Database).

> **⚠️ IMPORTANT:** We cannot host the *Entire App* on Vercel because Vercel Serverless Functions have a 10-second timeout, which breaks the **Real-Time Updates (SSE)** feature we just built. The Backend must be hosted on a platform that supports long-running servers, like Render.

---

## Phase 1: Database Setup (PostgreSQL)

Since your local database won't work on the cloud, you need a cloud hosted PostgreSQL.

1.  **Go to [Neon.tech](https://neon.tech)** (Free Tier is excellent).
2.  **Sign Up** and Create a Project.
3.  **Copy the Connection String** (it looks like `postgres://user:pass@ep-xyz.aws.neon.tech/neondb...`).
4.  **Save this URL**. You will need it for the Backend.

---

## Phase 2: Deploy Backend (Render)

Render allows long-running Node.js servers for free, perfect for our SSE logic.

1.  **Push your code to GitHub**.
    -   Create a repository on GitHub.
    -   Push your `server` and `client` folders.

2.  **Go to [Render.com](https://render.com)**.
3.  **New +** -> **Web Service**.
4.  **Connect your GitHub Repo**.
5.  **Settings**:
    -   **Root Directory**: `server`
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`
    -   **Environment Variables**: (Click "Add Environment Variable")
        -   `DATABASE_URL`: *(Paste your Neon Connection String)*
        -   `PORT`: `3001` (or let Render assign it)
        -   `NODE_VERSION`: `20`
        -   `FRONTEND_URL`: `https://your-frontend-app.vercel.app` *(You will get this URL in Phase 3. You can update this later.)*
6.  **Deploy**.
7.  **Copy the Backend URL** (e.g., `https://sports-week-api.onrender.com`).

---

## Phase 3: Deploy Frontend (Vercel)

Now we host the React UI on Vercel and point it to your Render backend.

1.  **Go to [Vercel.com](https://vercel.com)**.
2.  **Add New...** -> **Project**.
3.  **Import your GitHub Repo**.
4.  **Configure Project**:
    -   **Framework Preset**: Vite
    -   **Root Directory**: `client` (Click "Edit" and select `client` folder).
    -   **Environment Variables**:
        -   `VITE_API_URL`: `https://your-backend-url.onrender.com` (The URL from Phase 2).
5.  **Deploy**.
6.  **Done!** Your app is live.

---

## Phase 4: Final Configuration

1.  **Database Seeding**:
    -   Since it's a fresh database, you need to run the seed script.
    -   **Option A (Easy):** Connect to Neon using a tool like **pgAdmin** or **DBeaver** and run the contents of `server/db/schema.sql` and `server/db/seed.sql`.
    -   **Option B (Local):** Update your local `.env` with the Neon URL temporarily, run `npm run init-db`, then switch back.

2.  **Secure Backend (CORS)**:
    -   Once your frontend is deployed (Phase 3), update the `FRONTEND_URL` environment variable on Render (Phase 2) to your actual Vercel URL (e.g., `https://my-score-app.vercel.app`).
    -   Redeploy the backend (Render usually does this automatically on env var change).

---

## Summary of URLs

-   **Frontend:** `https://your-app.vercel.app`
-   **Backend:** `https://your-backend.onrender.com`
-   **Database:** `postgres://...neon.tech...`
