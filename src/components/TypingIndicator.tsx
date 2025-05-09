// src/components/TypingIndicator.tsx
import React from "react";
import { FiMessageSquare } from "react-icons/fi";

const TypingIndicator: React.FC = () => {
  return (
    <div
      className="flex justify-start items-start py-2"
      role="status"
      aria-label="Assistant is typing..."
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white">
          <FiMessageSquare />
        </div>
      </div>

      {/* Typing dots bubble */}
      <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-lg shadow-sm dark:shadow-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        <div className="flex space-x-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce"></span>
          <span
            className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
