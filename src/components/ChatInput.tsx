// src/components/ChatInput.tsx
import React from "react";
import type { FormEvent } from "react";

interface ChatInputProps {
  onSendMessage: (e: FormEvent) => void;
  isLoading: boolean;
  userInput: string;
  setUserInput: (input: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  userInput,
  setUserInput,
}) => {
  return (
    <form onSubmit={onSendMessage} className="flex gap-2 items-center">
      <input
        type="text"
        aria-label="News question input"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Ask something about the news..."
        className="flex-grow p-3 rounded-lg 
          bg-white text-gray-900 placeholder-gray-500 
          dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 
          border border-gray-300 dark:border-gray-600 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
          transition duration-200"
        disabled={isLoading}
      />
      <button
        type="submit"
        aria-label="Send message"
        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
          text-white font-semibold py-3 px-6 
          rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading || !userInput.trim()}
      >
        {isLoading ? "Sending..." : "Send"}
      </button>
    </form>
  );
};

export default ChatInput;
