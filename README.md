# Landy Agents Streamlit Console

This repository hosts a minimal Streamlit UI that can be deployed on Vercel to interact with the Landy V1 and V2 agent endpoints.

## Features

- **Dual tabs** for V1 (`/invoke`) and V2 (`/api/v2/invoke`) agents
- **Dynamic payload builder** for the message + identifier pairs each version expects
- **Response visualizer** that highlights `graph_output` and `recommended_listing` while still exposing the remaining JSON payload
- **Lightweight footprint** using Streamlit + Requests only, suited for Vercel's Python runtime

## Local Development

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Deploying to Vercel

1. Install the Vercel CLI and log in: `npm i -g vercel && vercel login`
2. From the project root run `vercel` (first-time setup) and then `vercel --prod` for production promotes.
3. The included [`vercel.json`](vercel.json) routes every request to [`streamlit_app.py`](streamlit_app.py), which Streamlit serves as a single-page app.

## Environment Variables

No secrets are required because the target endpoints are public. If authentication is introduced later, add them to Vercel's Project Settings or via `vercel env` and read them with `st.secrets`.

## Troubleshooting

- **Cold starts**: Keep the app minimal (single file) to minimize boot time on Vercel's serverless runtime.
- **Request failures**: The UI surfaces HTTP/JSON errors inline so you can quickly see connectivity issues with the upstream Landy services.
