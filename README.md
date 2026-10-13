
# MedScan AI

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An **educational** image-review tool. Upload a chest X-ray, brain MRI slice or skin photo and get a structured description of what is visible, an image-quality check, general points a clinician might consider, and a routine / soon / urgent follow-up flag.

> **Not a medical device.** MedScan AI does not diagnose or treat anything and must not guide medical decisions. Upload only public or fully de-identified images.

## What it really does

- Sends the image to a Google Gemini vision model through a small serverless function (`api/analyze.ts`). The API key stays on the server.
- Checks that the image matches the selected modality; mismatches are rejected instead of "analyzed".
- Never outputs a diagnosis, probabilities or confidence scores. Responses are validated and normalized server-side.
- Keeps case history and analytics **only in your browser** (`localStorage`). Images are never stored.
- Exports a text report and a CSV of your history.

Earlier versions of this repo simulated diagnoses from random numbers. That has been removed.

## Run locally

```bash
npm install
cp .env.example .env     # put your free key from https://aistudio.google.com/apikey in .env
npm run dev              # http://localhost:5173
```

`npm run dev` serves `/api/analyze` through a Vite middleware that uses the same code as production.

Other scripts: `npm run typecheck`, `npm run build`, `npm run lint`.

## Deploy 

Deployed on Vercel

## Notes and limits

- Free Gemini keys have rate limits and, on the free tier, Google may use submitted content to improve its products. Use only public or de-identified images.
- The in-memory rate limiter resets on cold starts; it is a courtesy guard, not security.
- The model can be overridden with `GEMINI_MODEL`.

## Project layout

api/analyze.ts Vercel function (POST /api/analyze)
api/_lib/analyze.ts Validation, prompt, Gemini call with retry/fallback, output normalization
src/ React UI (modules, workspace, report, history)
vite.config.ts Dev middleware for /api/analyze


## License

MIT
