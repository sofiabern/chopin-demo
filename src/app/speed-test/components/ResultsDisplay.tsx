"use client";

interface SpeedTestResult {
  download: number;
  upload: number;
  ping: number;
}

interface ResultsDisplayProps {
  speedTestResults: SpeedTestResult;
  setSpeedTestResults: (results: null) => void;
  setIsTestRunning: (isRunning: boolean) => void;
  setSubmissionMessage: (message: null) => void;
  setIframeKey: (key: number) => void;
  handleSubmit: () => void;
  isSubmitting: boolean;
  submissionMessage: string | null;
}

export default function ResultsDisplay({
  speedTestResults,
  setSpeedTestResults,
  setIsTestRunning,
  setSubmissionMessage,
  setIframeKey,
  handleSubmit,
  isSubmitting,
  submissionMessage
}: ResultsDisplayProps) {
  return (
    <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
      <p>Download Speed: {speedTestResults.download.toFixed(2)} Mbps</p>
      <p>Upload Speed: {speedTestResults.upload.toFixed(2)} Mbps</p>
      <p>Ping: {speedTestResults.ping.toFixed(1)} ms</p>

      <div className="mt-4 flex flex-col">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSpeedTestResults(null);
              setIsTestRunning(false);
              setSubmissionMessage(null);
              setIframeKey(Date.now()); // Reload iframe
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Test Again
          </button>
          <button
            onClick={handleSubmit}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors disabled:bg-gray-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Results'}
          </button>
        </div>
        {submissionMessage && (
          <div className={`mt-2 text-sm ${submissionMessage.startsWith('Error') ? 'text-red-700' : 'text-green-700'}`}>
            {submissionMessage}
          </div>
        )}
      </div>
    </div>
  );
} 