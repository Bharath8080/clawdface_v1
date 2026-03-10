# ClawdFace Frontend: Real-time Interactive UI

This directory contains the production-grade frontend for the ClawdFace platform, built with **Next.js 15** and **LiveKit Components**. It is designed for maximum speed, security, and responsiveness.

---

## 🏗️ Core Architecture: Hybrid Storage

To achieve a "No-DB" deployment, the frontend implements a **Hybrid Storage System**:

1.  **localStorage (Primary)**: Stores user configuration (OpenClaw URL, tokens) directly in the browser. This ensures that when deployed to serverless environments (which may have a read-only filesystem), user settings remain persistent for the user across sessions.
2.  **API Sync (Secondary)**: Every time a session starts, the frontend calls the `/api/user-config` endpoint. In local development, this endpoint saves the settings to `data/user-configs/[email].json` for visibility and archiving.
3.  **Bootstrap Logic**: On initial load, if `localStorage` is empty, the app attempts to "bootstrap" by fetching the user's last saved config from the server-side JSON archive.

---

## 🔐 Authentication & Verification

- **Integration**: Powered by `@react-oauth/google` using the **Implicit Flow**.
- **Context Provider**: `GoogleOAuthProvider` wraps the application (see `components/Providers.tsx`).
- **Hook-based Login**: Uses the `useGoogleLogin` hook to fetch high-fidelity profiles from the Google UserInfo API.
- **Persistence**: Successful sign-ins are stored in `localStorage` under `clawdface_auth`.
- **Environment Verification**: Access is restricted using the `VERIFIED_EMAILS` environment variable. This allows the administrator to authorize users globally via environment settings without managing a database table.

---

## 🎨 UI/UX Philosophy

- **Glassmorphism**: High-transparency layers with backdrop blurs.
- **Framer Motion**: Utilized for "Spring" physics based transitions between disconnected and connected states.
- **Real-time Visualization**: Custom `BarVisualizer` integration for high-fidelity audio feedback.
- **Responsive Sidebar**: Collapsible navigation with active session tracking.

---

## 📂 Directory Structure

| Path | Purpose |
| :--- | :--- |
| `app/api/` | Serverless endpoints (Connection details, metadata sync, OTP). |
| `components/` | Reusable React components (Sidebar, ControlBar, Visualizers). |
| `lib/` | Core utilities: `auth.ts`, `userStore.ts` (verification logic). |
| `data/` | Local JSON storage for development. |
| `public/` | Assets and brand identifiers. |

---

## 🔧 Frontend API Routes

### `POST /api/connection-details`
Generates an ephemeral LiveKit Token.
- **Feature**: Automatically embeds the user's OpenClaw configuration into the **Participant Metadata**. This is what allows the agent to be stateless.

### `POST /api/user-config`
Handles the sync between the browser and the local filesystem.

### `POST /api/send-otp` / `verify-otp`
Simple email-based verification system for authorized users.

---

