// src/components/LoadingSpinner.tsx
import React from "react";

const LoadingSpinner: React.FC = () => {
  return (
    <div
      className="flex justify-center items-center py-8"
      role="status"
      aria-label="Loading"
    >
      <div
        className="
          animate-spin rounded-full h-8 w-8 
          border-4 border-solid 
          border-blue-500 dark:border-blue-400 
          border-t-transparent
        "
      />
    </div>
  );
};

export default LoadingSpinner;
