// src/components/Logo.tsx
import React from "react";
import { FiMessageSquare } from "react-icons/fi";

const Logo: React.FC = () => {
  return (
    <div className="flex items-center" aria-label="NewsChat Logo" role="img">
      <div className="bg-blue-500 dark:bg-blue-400 p-2 rounded-lg mr-2">
        <FiMessageSquare className="text-white text-xl" />
      </div>
      {/* Add dark mode text color */}
      <span className="font-bold text-xl text-gray-900 dark:text-white">
        NewsChat
      </span>
    </div>
  );
};

export default Logo;
