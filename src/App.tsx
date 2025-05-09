// src/App.tsx
import "./App.css";
import React, { useState, useEffect, useRef } from "react";
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
  const [sessionId, setSessionId] = useState<string | null>(
    localStorage.getItem("chat_session_id")
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
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
                  timestamp: Date.now() - (history.length - index) * 60000,
                }))
          );
        }
      } catch (err) {
        console.error("Session initialization error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize session."
        );
        localStorage.removeItem("chat_session_id");
        setSessionId(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAssistantMessage]);

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
    setCurrentAssistantMessage("");
    setError(null);

    try {
      const response = await fetch(
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

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.detail || `HTTP error! status: ${response.status}`
        );
      }

      if (response.body) {
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let assistantResponseAccumulator = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const sseMessages = value.split("\n\n").filter((msg) => msg.trim());

          for (const sseMessage of sseMessages) {
            if (sseMessage.startsWith("data: ")) {
              const jsonDataString = sseMessage.substring(6);
              try {
                const parsedData = JSON.parse(jsonDataString);
                if (parsedData.text) {
                  assistantResponseAccumulator += parsedData.text;
                  setCurrentAssistantMessage(assistantResponseAccumulator);
                } else if (parsedData.error) {
                  setError(parsedData.error);
                  if (parsedData.final) break;
                }
              } catch (err) {
                console.error("Error parsing SSE JSON:", err);
              }
            }
          }
          if (error) break;
        }

        if (assistantResponseAccumulator.trim() && !error) {
          setMessages((prev) => [
            ...prev,
            {
              id: `asst-${Date.now()}`,
              role: "assistant",
              content: assistantResponseAccumulator.trim(),
              timestamp: Date.now(),
            },
          ]);
        }
        setCurrentAssistantMessage("");
      } else {
        throw new Error("Response body is null");
      }
    } catch (err) {
      console.error("Sending message failed:", err);
      setError(err instanceof Error ? err.message : "Failed to send message.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Error: ${
            err instanceof Error ? err.message : "Failed to get response."
          }`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    setShowResetConfirm(false);

    try {
      await clearChatHistory(sessionId);
      localStorage.removeItem("chat_session_id");
      setSessionId(null);
      setMessages([]);
      setCurrentAssistantMessage("");
    } catch (err) {
      console.error("Reset session error:", err);
      setError(err instanceof Error ? err.message : "Failed to reset session.");
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
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No messages yet. Start a conversation!</p>
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

              {currentAssistantMessage && (
                <ChatMessage
                  role="assistant"
                  content={currentAssistantMessage}
                  timestamp={Date.now()}
                />
              )}

              {isLoading && !currentAssistantMessage && <TypingIndicator />}
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-600 dark:bg-red-800 text-white text-center">
          <p className="font-semibold">Error</p>
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
