// src/services/api.ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // Optional: Add a unique id for React keys if not naturally available
  // id?: string;
}

export const getNewSession = async (): Promise<{
  session_id: string;
  message: string;
}> => {
  console.log(`API: Fetching new session from ${API_BASE_URL}/session/new`);
  const response = await fetch(`${API_BASE_URL}/session/new`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error: Failed to create new session",
      response.status,
      errorText
    );
    throw new Error(`Failed to create new session: ${errorText}`);
  }
  return response.json();
};

export const getChatHistory = async (
  sessionId: string
): Promise<{ session_id: string; history: ChatMessage[] }> => {
  console.log(
    `API: Fetching history for session ${sessionId} from ${API_BASE_URL}/chat/history/${sessionId}`
  );
  const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error: Failed to fetch chat history",
      response.status,
      errorText
    );
    throw new Error(`Failed to fetch chat history: ${errorText}`);
  }
  return response.json();
};

export const clearChatHistory = async (
  sessionId: string
): Promise<{ session_id: string; message: string }> => {
  console.log(
    `API: Clearing history for session ${sessionId} from ${API_BASE_URL}/chat/session/${sessionId}/clear`
  );
  const response = await fetch(
    `${API_BASE_URL}/chat/session/${sessionId}/clear`,
    { method: "POST" }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error: Failed to clear chat history",
      response.status,
      errorText
    );
    throw new Error(`Failed to clear chat history: ${errorText}`);
  }
  return response.json();
};

// Note: The function for sending a message and handling the SSE stream
// will be implemented directly in the ChatInterface component using the fetch API's streaming capabilities.
