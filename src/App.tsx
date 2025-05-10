// src/App.tsx
import "./App.css";
import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type { ChatMessage as ChatMessageType } from "./services/api"; // Assuming your api.ts defines this

import {
  getNewSession,
  getChatHistory,
  clearChatHistory,
} from "./services/api";

import Header from "./components/Header";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import ResetButton from "./components/ResetButton";
import LoadingSpinner from "./components/LoadingSpinner";
import TypingIndicator from "./components/TypingIndicator";

interface DisplayMessage extends ChatMessageType {
  id: string;
  timestamp?: number;
}

const App = () => {
  const [sessionId, setSessionId] = useState<string | null>(
    localStorage.getItem("chat_session_id")
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  // currentAssistantMessage is not strictly needed for non-streaming but kept for TypingIndicator logic
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const initializeSession = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        let currentSid = sessionId;
        if (!currentSid) {
          const newSessionData = await getNewSession();
          currentSid = newSessionData.session_id;
          setSessionId(currentSid);
          localStorage.setItem("chat_session_id", currentSid);
          setMessages([
            {
              id: `welcome-${Date.now()}`,
              role: "assistant",
              content:
                "Welcome to NewsChat! Ask me anything about recent news articles.",
              timestamp: Date.now(),
            },
          ]);
        } else {
          const historyData = await getChatHistory(currentSid);
          const history = historyData.history;
          setMessages(
            history.length === 0
              ? [
                  {
                    id: `welcome-${Date.now()}`,
                    role: "assistant",
                    content:
                      "Welcome to NewsChat! Ask me anything about recent news articles.",
                    timestamp: Date.now(),
                  },
                ]
              : history.map((msg, index) => ({
                  ...msg,
                  id: `hist-${index}-${Date.now()}`,
                  timestamp: Date.now() - (history.length - index) * 60000, // Simple timestamp offset
                }))
          );
        }
      } catch (err) {
        console.error("Session initialization error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize session.";
        setError(errorMessage);
        localStorage.removeItem("chat_session_id");
        setSessionId(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, [sessionId]); // Re-run if sessionId changes (e.g., after reset)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Removed currentAssistantMessage as it's not streaming character by character

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !sessionId || isLoading) return;

    setShowResetConfirm(false);
    const newUserMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userInput.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput("");
    setIsLoading(true);
    setCurrentAssistantMessage("typing..."); // To show typing indicator
    setError(null);

    try {
      const fetchResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Id": sessionId,
          },
          body: JSON.stringify({ query: newUserMessage.content }),
        }
      );

      // Clear typing indicator as soon as we start processing response
      setCurrentAssistantMessage("");

      if (!fetchResponse.ok) {
        let errorDetail = `HTTP error! status: ${fetchResponse.status}`;
        try {
          const errData = await fetchResponse.json();
          errorDetail = errData.detail || errData.error || errorDetail; // Prioritize backend's error message
        } catch (jsonParseError) {
          // If error response is not JSON, use the status text or default message
          errorDetail = fetchResponse.statusText || errorDetail;
          console.warn(
            "Could not parse error response as JSON:",
            jsonParseError
          );
        }
        throw new Error(errorDetail);
      }

      // --- THIS IS THE MODIFIED PART FOR NON-STREAMING ---
      const responseData = await fetchResponse.json();

      if (responseData && typeof responseData.response === "string") {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: "assistant",
            content: responseData.response.trim(),
            timestamp: Date.now(),
          },
        ]);
      } else {
        console.error(
          "Unexpected response structure from /chat endpoint:",
          responseData
        );
        throw new Error("Received an invalid response format from the server.");
      }
      // --- END OF MODIFICATION ---
    } catch (err) {
      console.error("Sending message failed:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while sending the message.";
      setError(errorMessage);
      // Optionally add the error message to the chat display as an assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentAssistantMessage(""); // Ensure typing indicator is cleared
    }
  };

  const handleResetSession = async () => {
    if (!sessionId || isInitializing) return; // Prevent reset if no session or still initializing
    setIsLoading(true);
    setError(null);
    setShowResetConfirm(false);

    try {
      await clearChatHistory(sessionId); // API call to clear server-side history
      localStorage.removeItem("chat_session_id"); // Clear local storage
      setSessionId(null); // This will trigger the useEffect for initialization to create a new session
      setMessages([]); // Clear messages locally immediately
      setCurrentAssistantMessage("");
    } catch (err) {
      console.error("Reset session error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reset session.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header
        sessionId={sessionId}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <div className="flex-grow overflow-y-auto p-4 md:p-6">
        <div className="container mx-auto max-w-4xl">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner />
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                Initializing your session...
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              {/*
                The currentAssistantMessage logic was for character-by-character streaming.
                For non-streaming, we use a simpler TypingIndicator.
              */}
              {isLoading && <TypingIndicator />}
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-600 dark:bg-red-800 text-white text-center">
          <p className="font-semibold">Error Display</p>{" "}
          {/* Changed title for clarity */}
          <p className="text-sm">{error}</p>
        </div>
      )}

      <footer className="bg-white dark:bg-gray-800 p-4 shadow-md">
        <div className="container mx-auto max-w-4xl">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            userInput={userInput}
            setUserInput={setUserInput}
          />
          <ResetButton
            showResetConfirm={showResetConfirm}
            setShowResetConfirm={setShowResetConfirm}
            handleResetSession={handleResetSession}
            isLoading={isLoading}
            isInitializing={isInitializing}
            sessionId={sessionId}
          />
        </div>
      </footer>
    </div>
  );
};

export default App;
