# News RAG Chatbot - System Flow Explanation

## 1. Introduction

This document outlines the end-to-end system architecture and data flow for the News RAG (Retrieval-Augmented Generation) Chatbot. The system is designed to allow users to ask questions and receive answers based on a corpus of ingested news articles. It comprises three main components: a React-based Frontend, a Node.js/Express Proxy Service, and a Python/FastAPI ML Service.

**Core Technologies:**

- **Frontend:** React, Tailwind CSS
- **Proxy Service:** Node.js, Express.js, Redis (for session/history)
- **ML Service:** Python, FastAPI, Sentence Transformers, Qdrant (vector DB), Google Gemini (LLM)
- **Containerization:** Docker

## 2. System Components Overview

![System Architecture Diagram (Conceptual)](https://i.imgur.com/your-conceptual-diagram-placeholder.png)
_(**Note:** You should create a simple diagram for this. Tools like diagrams.net (draw.io), Excalidraw, or even PowerPoint/Google Slides can be used. A simple block diagram showing Frontend -> Proxy -> ML Service, with Redis and Qdrant as supporting services, would suffice.)_

### 2.1. Frontend (React Application)

- **Purpose:** Provides the user interface for interacting with the chatbot.
- **Responsibilities:**
  - Managing user sessions (obtaining and storing a `session_id`).
  - Displaying chat messages (user queries and assistant responses).
  - Handling user input and sending queries to the backend.
  - Displaying chat history.
  - Allowing users to reset their session.

### 2.2. Proxy Service (Node.js/Express)

- **Purpose:** Acts as a gateway between the frontend and the ML service, and manages user-specific state.
- **Responsibilities:**
  - Generating new session IDs for users.
  - Storing and retrieving chat history for each session using Redis.
  - Clearing session history from Redis.
  - Receiving chat queries from the frontend.
  - Authenticating itself and forwarding queries to the ML Service.
  - Returning the ML Service's response to the frontend.

### 2.3. ML Service (Python/FastAPI)

- **Purpose:** The core AI engine responsible for the Retrieval-Augmented Generation pipeline.
- **Responsibilities:**
  - Receiving queries from the Proxy Service.
  - Performing intent classification (distinguishing conversational queries from RAG-worthy questions).
  - For RAG-worthy questions:
    - Embedding the user's query into a vector representation using a Sentence Transformer model (`all-MiniLM-L6-v2`).
    - Searching a Qdrant vector database for relevant news article chunks based on the query embedding and a score threshold.
    - Formatting the retrieved context.
  - Constructing a detailed prompt for the LLM (Google Gemini), including system instructions, retrieved context (if any), and the user's query.
  - Generating a response using the Gemini API.
  - Returning the generated response (and any relevant source information) to the Proxy Service.

### 2.4. Supporting Services

- **Redis:** An in-memory data store used by the Proxy Service to store chat history for each user session. A TTL (Time-To-Live) is set on session data.
- **Qdrant:** A vector database used by the ML Service to store embeddings of news article chunks and perform semantic similarity searches.
- **Google Gemini API:** The Large Language Model used for generating final answers based on the user's query and retrieved context.

## 3. Data Ingestion Flow (Offline Process)

Before the chatbot can answer questions about news, the news articles must be processed and stored in the Qdrant vector database. This is typically an offline or batch process.

1.  **Source Articles:** News articles are obtained (for this project, text content from ~50 articles was prepared). In a production system, this would involve web scraping or RSS feed processing.
2.  **Content Extraction:** The main textual content is extracted from each article.
3.  **Chunking (Optional but Recommended for Long Articles):** Long articles are broken down into smaller, semantically coherent chunks. For this project with shorter news snippets, each article might be treated as a single chunk.
4.  **Embedding:** Each chunk of text is converted into a dense vector embedding using the `sentence-transformers/all-MiniLM-L6-v2` model. This model outputs 384-dimensional vectors.
5.  **Storage in Qdrant:**
    - A Qdrant collection (e.g., `news_articles_v3`) is created with a vector size of 384 and using Cosine distance for similarity.
    - Each chunk's vector embedding, along with its original text and metadata (e.g., source name, source URL, article ID), is stored as a point in the Qdrant collection.
    - This process is executed using a dedicated Python script (`ingest_data.py`).

## 4. User Interaction & Chat Flow (Online Process)

This describes the sequence of events when a user interacts with the chatbot:

### 4.1. Session Initialization

1.  **Frontend:** When the user first opens the application, the frontend checks `localStorage` for an existing `chat_session_id`.
2.  **No Session ID Found:**
    - **Frontend** makes a `POST` request to the Proxy Service's `/session/new` endpoint.
    - **Proxy Service** generates a unique `session_id` (UUID v4).
    - **Proxy Service** returns the `session_id` to the frontend.
    - **Frontend** stores this `session_id` in `localStorage` and its component state. It then typically displays a welcome message.
3.  **Session ID Found:**
    - **Frontend** uses the `session_id` from `localStorage`.
    - **Frontend** makes a `GET` request to the Proxy Service's `/chat/history/:sessionId` endpoint, passing the stored `session_id`.
    - **Proxy Service** queries Redis using the key `chat_history:<session_id>` to retrieve the list of past messages.
    - **Proxy Service** returns the chat history to the frontend.
    - **Frontend** displays the retrieved chat history. If no history, a welcome message is shown.

### 4.2. Sending a Chat Message

1.  **Frontend:** The user types a message (e.g., "hi" or "What's new in tech?") into the input box and submits it.
2.  **Frontend** constructs a JSON payload: `{ "query": "user's message" }`.
3.  **Frontend** makes a `POST` request to the Proxy Service's `/chat` endpoint.
    - **Headers:** Includes `Content-Type: application/json` and `X-Session-Id: <current_session_id>`.
    - **Body:** The JSON payload from step 2.
4.  **Proxy Service (`/chat` endpoint):**
    a. Receives the request, validates the `X-Session-Id` and `query`.
    b. Stores the user's message in Redis:
    _ Connects to Redis (if not already connected).
    _ Appends `{"role": "user", "content": "user's message"}` to the list at key `chat_history:<session_id>`.
    c. Forwards the request to the ML Service:
    _ Constructs a payload for the ML service: `{ "query": "user's message", "session_id": "<current_session_id>" }`. (Note: `session_id` is optional for the ML service's current RAG logic but can be passed).
    _ Makes a `POST` request to the ML Service's `/generate` endpoint. \* **Headers:** Includes `Content-Type: application/json` and `Authorization: Bearer <ML_SERVICE_API_KEY>`.
5.  **ML Service (`/generate` endpoint):**
    a. Receives the query from the Proxy.
    b. **Intent Detection:** Performs a basic check (e.g., using keywords like "hi", "thanks", or query length) to classify if the `query` is conversational or requires RAG.
    c. **If Conversational:**
    i. Skips the RAG pipeline (embedding, Qdrant search).
    ii. Constructs a prompt for Gemini using the detailed system prompt, specifically instructing it to handle a conversational input (e.g., `The user has sent a greeting or casual remark: '{user_query}'... Respond conversationally...`).
    d. **If RAG-worthy Query:**
    i. **Embed Query:** Encodes the `query` into a 384-dimensional vector using `sentence-transformers/all-MiniLM-L6-v2`.
    ii. **Search Qdrant:** Searches the `news_articles_v3` collection in Qdrant using the query vector. It retrieves the top-k (e.g., 3) most similar document chunks that also meet a `score_threshold` (e.g., 0.5).
    iii. **Format Context:**
    _ If relevant documents are found (above threshold), their text content is concatenated to form a `context_str`. Metadata like source name and URL are also extracted for `relevant_sources`.
    _ If no sufficiently relevant documents are found, `context_str` is set to a message like "No specific documents were found..."
    iv. **Construct Prompt:** Creates a full prompt for Gemini. This includes: 1. The detailed **System Prompt** (defining persona, context handling rules, conversational dynamics, ethical guidelines). 2. The **Retrieved Context** (`context_str`). 3. The **User's Query**.
    e. **Generate Response with LLM:** Sends the `full_prompt` to the Google Gemini API (e.g., `gemini-1.5-flash-latest`).
    f. **Return to Proxy:** Sends a JSON response back to the Proxy Service, e.g., `{ "response": "LLM's generated text", "relevant_sources": [...] }`. (`relevant_sources` will be empty if the query was conversational or no context was found).
6.  **Proxy Service (continues):**
    a. Receives the JSON response from the ML Service.
    b. Stores the assistant's message in Redis:
    _ Extracts `response.data.response` (the textual answer).
    _ Appends `{"role": "assistant", "content": "assistant's answer"}` to the list at key `chat_history:<session_id>`.
    _ Sets/refreshes the TTL for the chat history key (e.g., 1 hour).
    c. Forwards the relevant part of the response to the Frontend:
    _ Sends a JSON response: `{ "response": "assistant's answer" }`. (This matches what the non-streaming frontend expects).
7.  **Frontend:**
    a. Receives the JSON response from the Proxy.
    b. Parses the JSON and extracts the `response` text.
    c. Adds the assistant's message to its local `messages` state, causing the UI to update and display the new message.

### 4.3. Clearing Chat History

1.  **Frontend:** User clicks the "Reset Session" button.
2.  **Frontend** makes a `POST` request to the Proxy Service's `/chat/session/:sessionId/clear` endpoint.
3.  **Proxy Service:**
    a. Deletes the key `chat_history:<session_id>` from Redis.
    b. Returns a success message.
4.  **Frontend:**
    a. Clears `localStorage`'s `chat_session_id`.
    b. Sets its internal `sessionId` state to `null`, which triggers the session initialization flow again (a new session ID will be fetched, and a welcome message displayed).

## 5. Caching and Session Management (Redis in Proxy)

- **Session IDs:** Generated by the Proxy service (`uuidv4`) and managed by the frontend (stored in `localStorage` and sent in headers).
- **Chat History:**
  - Stored in Redis by the Proxy Service.
  - Each session has its own Redis list, keyed by `chat_history:<session_id>`.
  - Messages (user and assistant) are pushed to this list as JSON strings.
  - A Time-To-Live (TTL) of 1 hour is applied to the Redis key for chat history after each new message. This means inactive chat histories will automatically expire from Redis.
- **Cache Warming:** Not applicable for chat history as it's dynamic and user-specific. For other potential caches (e.g., if caching LLM responses for common queries, which is not implemented here), warming might involve pre-populating with popular items, but this is beyond the current scope.

## 6. Noteworthy Design Decisions & Potential Improvements

### Design Decisions:

- **Separation of Concerns:** The three-tier architecture (Frontend, Proxy, ML Service) allows for independent development, scaling, and technology choices for each component.
- **Stateless ML Service (Mostly):** The ML service itself does not store chat history. It processes each query based on the information provided in that single request (query + optional RAG context). Session context is managed by the Proxy.
- **Non-Streaming Response:** For simplicity and to meet assignment core requirements within time constraints, the backend provides a single JSON response rather than streaming tokens. The frontend is adapted for this.
- **Explicit Conversational Handling:** The ML service includes logic to detect simple conversational inputs (greetings, thanks) and tailors the LLM prompt to respond appropriately without always invoking the full RAG pipeline or trying to answer based on irrelevant news context. This uses a `score_threshold` in Qdrant search and conditional prompt engineering.
- **Robust System Prompt:** A detailed system prompt is used for the LLM to guide its persona, tone, context usage, and ethical considerations, leading to higher quality and more appropriate responses.

### Potential Improvements:

- **End-to-End Streaming:** Implement token streaming from the Gemini API through the ML Service, Proxy Service, and to the Frontend for a more responsive "typing" effect.
- **Advanced Intent Detection:** Use a more sophisticated model or service to classify user intent (e.g., question-answering, chit-chat, command) to better route requests or select prompts.
- **Chat History in LLM Prompt:** For more coherent multi-turn conversations, a summary of recent chat history could be included in the prompt sent to the LLM by the ML service (would require the proxy to send history or the ML service to fetch it).
- **LLM Response Caching:** Cache responses from the LLM for identical (or semantically very similar) queries + context pairs in Redis to reduce latency and API costs.
- **Automated News Ingestion:** Develop a robust pipeline to automatically fetch, process, and ingest new articles into Qdrant regularly.
- **Context Re-ranking:** Implement a re-ranking step after initial retrieval from Qdrant to further optimize the relevance of documents sent to the LLM.
- **User Authentication:** Add proper user accounts instead of just session IDs for persistence and personalization.
- **Enhanced Observability:** Integrate more detailed logging, distributed tracing (e.g., OpenTelemetry), and metrics for monitoring system health and performance.

## 7. Conclusion

The News RAG Chatbot system effectively combines information retrieval techniques with generative AI to provide a conversational interface for querying news articles. The architecture is modular, and while currently non-streaming for simplicity, it provides a solid foundation for future enhancements. Key to its current user-friendliness is the refined LLM prompting strategy that handles both factual news queries and simple conversational interactions appropriately.
