const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"; // Proxy default port

// Message structure used in chat history
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { source: string; url?: string; relevance_score?: number }[]; // optional citations
}

// ────────────── API CALLS ──────────────

// Create a new session
export const getNewSession = async (): Promise<{
  session_id: string;
  message: string;
}> => {
  const url = `${API_BASE_URL}/session/new`;
  console.log(`API: Creating new session via POST ${url}`);

  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error: Failed to create session",
      response.status,
      errorText
    );
    throw new Error(`Failed to create new session: ${errorText}`);
  }

  return response.json();
};

// Fetch chat history for a given session
export const getChatHistory = async (
  sessionId: string
): Promise<{ session_id: string; history: ChatMessage[] }> => {
  const url = `${API_BASE_URL}/chat/history/${sessionId}`;
  console.log(`API: Fetching chat history GET ${url}`);

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error: Failed to fetch history",
      response.status,
      errorText
    );
    throw new Error(`Failed to fetch chat history: ${errorText}`);
  }

  return response.json();
};

// Clear chat history for a given session
export const clearChatHistory = async (
  sessionId: string
): Promise<{ session_id: string; message: string }> => {
  const url = `${API_BASE_URL}/chat/session/${sessionId}/clear`;
  console.log(`API: Clearing history POST ${url}`);

  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error: Failed to clear history",
      response.status,
      errorText
    );
    throw new Error(`Failed to clear chat history: ${errorText}`);
  }

  return response.json();
};

// Send a chat message (non-streaming version)
// You may later upgrade this to SSE/streaming
export const sendMessage = async (
  sessionId: string,
  query: string
): Promise<{ response: string; sources?: ChatMessage["sources"] }> => {
  const url = `${API_BASE_URL}/chat`;
  console.log(`API: Sending message POST ${url}`, { sessionId, query });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error: Failed to send chat", response.status, errorText);
    throw new Error(`Failed to send message: ${errorText}`);
  }

  return response.json();
};
