// src/components/ChatMessage.tsx
import React from "react";
import { FiMessageSquare, FiUser } from "react-icons/fi";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

// Format timestamp
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  timestamp,
}) => {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex items-start max-w-[85%] md:max-w-[75%] ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? "ml-3" : "mr-3"}`}>
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              text-white dark:text-white
              ${
                isUser
                  ? "bg-green-500 dark:bg-green-600"
                  : "bg-blue-500 dark:bg-blue-600"
              }
            `}
            aria-label={isUser ? "User avatar" : "Assistant avatar"}
          >
            {isUser ? <FiUser /> : <FiMessageSquare />}
          </div>
        </div>

        {/* Message bubble */}
        <div
          className={`
            px-4 py-3 rounded-lg message-bubble message-animation
            shadow-sm dark:shadow-md
            ${
              isUser
                ? "bg-green-100 dark:bg-green-900 text-gray-800 dark:text-gray-100 rounded-tr-none"
                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"
            }
          `}
        >
          <p className="whitespace-pre-wrap message-text">{content}</p>

          {/* Timestamp */}
          {timestamp && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
              {formatTime(timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
