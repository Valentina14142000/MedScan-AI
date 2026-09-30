# 🩺 MedScan AI

[![React](https://img.shields.io/badge/React-18%2B-blue?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Frontend_Tooling-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0%2B-38BDF8?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%2B_Functions-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MedScan AI** is a professional, React-based diagnostic platform prototype designed for exploring AI-assisted medical imaging workflows. The app features a modern clinical dashboard with dedicated workspaces for multi-modality case reviews and cross-module diagnostic analytics.

---

## ✨ Features

* **Multi-Module Diagnostic Workspaces:**
  * **Chest X-Ray Analysis:** Pulmonary screening and anomaly detection.
  * **Brain MRI Analysis:** Neuroimaging evaluation and classification.
  * **Dermatology Image Review:** Skin lesion assessment and classification.
* **Simulated Diagnostic Output:**
  * High-precision confidence scores and class probability breakdowns.
  * Explainability insights and clinical-grade metrics.
* **Clinical Analytics Dashboard:** Performance overviews, cross-module comparisons, and recent case tracking.
* **Backend Persistence:** Fully integrated with Supabase for storing and retrieving secure analysis records.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React, TypeScript, Vite
* **Styling & UI:** Tailwind CSS, Lucide Icons
* **Backend & Storage:** Supabase JavaScript Client & Edge Functions

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone GitHub repo
cd medscan-ai
```

### 2. Install Dependencies

```Bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables

Create a .env file in the root directory and add your Supabase project keys:

```Code snippet
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```Bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open http://localhost:5173 in your browser to view the clinical dashboard.
