// src/components/Header.tsx
import React from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import Logo from "./Logo";

interface HeaderProps {
  sessionId: string | null;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({
  sessionId,
  darkMode,
  toggleDarkMode,
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md transition-colors duration-300">
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center h-16">
        <Logo />

        <div className="flex items-center space-x-4">
          {sessionId && (
            <span className="hidden md:inline-block text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md">
              Session: {sessionId.substring(0, 8)}...
            </span>
          )}

          <button
            onClick={toggleDarkMode}
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
            className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? (
              <FiSun className="text-xl text-yellow-400" />
            ) : (
              <FiMoon className="text-xl text-gray-800 dark:text-gray-100" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
