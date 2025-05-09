// src/components/ResetButton.tsx
import React from "react";

interface ResetButtonProps {
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  handleResetSession: () => void;
  isLoading: boolean;
  isInitializing: boolean;
  sessionId: string | null;
}

const ResetButton: React.FC<ResetButtonProps> = ({
  showResetConfirm,
  setShowResetConfirm,
  handleResetSession,
  isLoading,
  isInitializing,
  sessionId,
}) => {
  const isDisabled = isLoading || isInitializing || !sessionId;

  return (
    <div className="mt-2">
      {!showResetConfirm ? (
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          disabled={isDisabled}
          aria-label="Reset chat session"
        >
          Reset Session
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleResetSession}
            className="flex-1 bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
            disabled={isDisabled}
            aria-label="Confirm reset"
          >
            Confirm Reset
          </button>
          <button
            onClick={() => setShowResetConfirm(false)}
            className="flex-1 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
            aria-label="Cancel reset"
            disabled={isDisabled}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ResetButton;
