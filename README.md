<div align="center">

# 🩺 MedScan AI

**An Intelligent, Privacy-First Educational Medical Image Review Tool**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---

> ⚠️ **Important Disclaimer**
> **MedScan AI is NOT a medical device.** It does not diagnose, treat, prevent, or cure any condition, and must **never** be used to guide clinical decisions or emergency medical care. Results can be wrong. Upload only public or fully de-identified educational images. In case of a health worry, see a clinician; in an emergency, contact your local emergency services immediately.

---

## 📸 Overview

![MedScan AI Application Interface](./docs/preview.png)

**MedScan AI** is an open-source educational platform designed to demonstrate the application of multimodal Large Language Models (LLMs) to medical imaging review. Users can upload a **Chest X-Ray**, **Brain MRI slice**, or **Dermatology photo** to receive structured visual observations, image quality evaluations, clinical consideration points, and routine follow-up triage indicators.

## What it really does

- Sends the image to a Google Gemini vision model through a small serverless function (`api/analyze.ts`). The API key stays on the server.
- Checks that the image matches the selected modality; mismatches are rejected instead of "analyzed".
- Never outputs a diagnosis, probabilities or confidence scores. Responses are validated and normalized server-side.
- Keeps case history and analytics **only in your browser** (`localStorage`). Images are never stored.
- Exports a text report and a CSV of your history.

  ---

## 🏗️ Architecture & Tech Stack

* **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
* **Build System**: Vite with built-in development API middleware
* **AI Engine**: Google Gemini Vision Model (`gemini-1.5-flash` or custom override)
* **Backend Functions**: Vercel Serverless Functions (`/api/analyze`)

---



