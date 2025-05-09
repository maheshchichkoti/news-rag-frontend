# News RAG Chatbot - Frontend

## Overview

This React application provides the user interface for interacting with the News RAG Chatbot backend. It features a chat screen, message streaming, and session management.

## Tech Stack

- React (with TypeScript/JavaScript)
- Vite (Build Tool)
- Tailwind CSS (Styling)
- `fetch` API (for HTTP requests and SSE streaming)

## Local Development Setup

1.  **Clone the repository:**

    ```bash
    git clone <your-frontend-repo-url>
    cd news-rag-frontend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the project root (`news-rag-frontend/.env`):

    ```env
    # .env
    VITE_API_BASE_URL=http://localhost:8000
    ```

    (This points to your local backend during development).

4.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    The frontend will typically be available at `http://localhost:5173`.

## Deployment (Example: Netlify/Vercel)

1.  **Connect Repository:** Link this GitHub repository to your Netlify/Vercel account.
2.  **Build Settings:**
    - Build Command: `npm run build` (or `yarn build`)
    - Publish Directory: `dist`
3.  **Environment Variables:**
    Set `VITE_API_BASE_URL` to the public URL of your deployed backend API (e.g., `https://your-backend-app.onrender.com`).

## Features

- Real-time chat interface.
- Streaming responses from the AI.
- Session persistence using `localStorage` and backend Redis.
- Ability to view chat history.
- Option to reset the current session.
