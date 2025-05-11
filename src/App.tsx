// src/App.tsx
import "./App.css";
import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type { ChatMessage as ChatMessageType } from "./services/api";

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
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Initialize from localStorage sync to avoid flicker
    const savedSid = localStorage.getItem("chat_session_id");
    console.log("Initial sessionId from localStorage:", savedSid);
    return savedSid;
  });
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Start as true
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return (
      savedMode === "true" ||
      (!savedMode && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true); // To prevent state updates on unmounted component

  useEffect(() => {
    return () => {
      isMounted.current = false; // Set to false when component unmounts
    };
  }, []);

  useEffect(() => {
    console.log("Dark mode effect: ", darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    console.log(
      "SessionID changed or component mounted. Current SessionId:",
      sessionId
    );
    const initializeSession = async () => {
      if (!isMounted.current) return;
      setIsInitializing(true);
      setError(null);
      console.log("Initializing session. Current stored sessionId:", sessionId);

      try {
        let currentSid = sessionId; // Use the state variable
        if (!currentSid) {
          console.log("No current session ID found, fetching new session...");
          const newSessionData = await getNewSession();
          if (!isMounted.current) return;
          currentSid = newSessionData.session_id;
          console.log("New session created:", currentSid);
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
          console.log(`Fetching chat history for session ID: ${currentSid}...`);
          const historyData = await getChatHistory(currentSid);
          if (!isMounted.current) return;
          const history = historyData.history;
          console.log("Fetched history:", history);
          setMessages(
            history.length === 0
              ? [
                  {
                    id: `welcome-empty-hist-${Date.now()}`,
                    role: "assistant",
                    content:
                      "Welcome back! Ask me anything about recent news articles.",
                    timestamp: Date.now(),
                  },
                ]
              : history.map((msg, index) => ({
                  ...msg,
                  id: `hist-${index}-${Date.now()}`,
                  timestamp: Date.now() - (history.length - index) * 1000, // Shorter offset for testing
                }))
          );
        }
      } catch (err) {
        console.error("Session initialization error:", err);
        if (!isMounted.current) return;
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize session.";
        setError(errorMessage);
        localStorage.removeItem("chat_session_id"); // Important to clear inconsistent state
        setSessionId(null); // This should trigger re-initialization
      } finally {
        if (isMounted.current) setIsInitializing(false);
        console.log("Session initialization finished.");
      }
    };

    initializeSession();
  }, [sessionId]); // Trigger ONLY when sessionId changes.

  useEffect(() => {
    if (messages.length > 0) {
      // Only scroll if there are messages
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    console.log("handleSendMessage triggered.");
    if (!userInput.trim() || !sessionId || isLoading) {
      console.log(
        "handleSendMessage: Aborting - input empty, no session, or already loading."
      );
      return;
    }

    setShowResetConfirm(false);
    const newUserMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userInput.trim(),
      timestamp: Date.now(),
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, newUserMessage]);
    const currentInput = userInput.trim(); // Capture before clearing
    setUserInput("");
    setIsLoading(true);
    // setCurrentAssistantMessage("typing..."); // Replaced by <TypingIndicator /> based on isLoading
    setError(null);
    console.log("User message added to UI, calling API...");

    try {
      const apiUrl = `${
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
      }/chat`;
      console.log("Fetching from API:", apiUrl, "with query:", currentInput);

      const fetchResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ query: currentInput }), // Use captured currentInput
      });

      console.log("API response status:", fetchResponse.status);

      if (!fetchResponse.ok) {
        let errorDetail = `HTTP error! status: ${fetchResponse.status}`;
        try {
          const errData = await fetchResponse.json();
          console.error("API error response data:", errData);
          errorDetail = errData.detail || errData.error || errorDetail;
        } catch (jsonParseError) {
          errorDetail = fetchResponse.statusText || errorDetail;
          console.warn(
            "Could not parse error response as JSON:",
            jsonParseError
          );
        }
        throw new Error(errorDetail);
      }

      const responseData = await fetchResponse.json();
      console.log("Frontend received API responseData:", responseData);

      if (responseData && typeof responseData.response === "string") {
        if (!isMounted.current) return;
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: "assistant",
            content: responseData.response.trim(),
            timestamp: Date.now(),
          },
        ]);
        console.log("Assistant message added to UI.");
      } else {
        console.error(
          "Unexpected response structure from /chat endpoint:",
          responseData
        );
        throw new Error("Received an invalid response format from the server.");
      }
    } catch (err) {
      console.error("Sending message failed:", err);
      if (!isMounted.current) return;
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      setMessages((prev) => [
        // Optionally add error to chat
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      if (isMounted.current) setIsLoading(false);
      // setCurrentAssistantMessage(""); // Not needed as TypingIndicator handles this
      console.log("handleSendMessage finished.");
    }
  };

  const handleResetSession = async () => {
    console.log("handleResetSession triggered.");
    if (!sessionId || isInitializing) return;
    setIsLoading(true);
    setError(null);
    setShowResetConfirm(false);

    try {
      await clearChatHistory(sessionId);
      console.log("Server history cleared for session:", sessionId);
      localStorage.removeItem("chat_session_id");
      console.log("Local session ID cleared.");
      if (isMounted.current) {
        setSessionId(null); // This will trigger the initializeSession useEffect
        // setMessages([]); // initializeSession will set welcome message
      }
    } catch (err) {
      console.error("Reset session error:", err);
      if (isMounted.current) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to reset session.";
        setError(errorMessage);
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
      console.log("handleResetSession finished.");
    }
  };

  // Conditional rendering for TypingIndicator
  const showTypingIndicator = isLoading; // Simpler: show if isLoading is true

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
              {showTypingIndicator && <TypingIndicator />}
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-600 dark:bg-red-800 text-white text-center">
          <p className="font-semibold">Error Display</p>
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
