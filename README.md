# Lifekina — Your Private Daily Workspace & Expense Tracker

Lifekina is a sleek, modern, **100% local-first workspace** designed for managing your daily expenses, tasks, notes, calendar events, and reminders with absolute privacy. No cloud databases, no external servers, no login required — everything stays strictly on your device.

---

## ✨ Features

### 📊 1. Comprehensive Expense Tracker
- **Fast Expense Logging:** Record daily expenses with amount, category, description, date, and custom notes.
- **Custom Categories & Icons:** Personalize expenses with curated color swatches and icons.
- **Analytics & Breakdown:** View monthly stats, category percentage distributions, and spending trends.
- **Multi-Currency Support:** Switch between major global currencies (`$`, `€`, `£`, `₹`, `¥`, etc.).

### 🗓️ 2. Calendar & Daily Activity Hub
- **Interactive Month & Week Views:** Visually inspect expenses, tasks, and reminders day-by-day.
- **Day Activity Drawer:** Click any date to view a detailed breakdown of expenses incurred, tasks due, and active reminders.
- **Inline Action Bar:** Add reminders, expenses, or tasks directly from the calendar without leaving the page.
- **Activity Chips:** Color-coded badges highlighting spent totals, task completion (`2/3`), and reminder titles directly on grid cells.

### 🔔 3. Timed Reminders & Browser Push Notifications
- **Web Notification API Integration:** Get native browser alerts for important daily events.
- **Audio Chime Engine:** Synthesised web audio chime plays when reminders fire.
- **Offline & PWA Ready:** Service worker integration (`sw.js`) ensures reminders stay registered across sessions.

### 📋 4. Daily Tasks & Kanban Workflow
- **Kanban Task Board:** Organize tasks by `To Do`, `In Progress`, and `Completed`.
- **Period & Priority Filters:** View tasks filtered by Monthly, Weekly, Quarterly, or Yearly periods.
- **Sticky Note Accents:** Color-code task cards for visual clarity.
- **Duration & Timeline Metrics:** Track time spent in `To Do`, `In Progress`, and total completion duration.

### 📝 5. Notes & Scratchpad
- **Local Markdown Notes:** Capture quick thoughts, journals, and project ideas.
- **Pinning & Search:** Pin important notes to the top and filter by tags.

### 🛡️ 6. 100% Privacy & Data Ownership
- **IndexedDB Local Storage:** Fast client-side database storing all your transactions, tasks, notes, and reminders locally.
- **Data Export & Import:** Backup your data as a JSON file or restore it anytime.
- **Biometric / WebAuthn & PIN Lock Option:** Optional local passkey or PIN lock to protect your workspace.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm**, **pnpm**, or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/lifekina.git
   cd lifekina
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to start using Lifekina!

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling:** Vanilla CSS (Custom Design System with Glassmorphism, CSS Variables)
- **Database:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via `idb` wrapper
- **Icons:** [Lucide React](https://lucide.dev/)
- **Notifications:** Browser Web Notification API & Web Audio API
- **PWA:** Web App Manifest & Service Worker

---

## 📄 License

This project is licensed under the MIT License — feel free to use and modify it for your own daily productivity space.
