"use client";

import { SpeedTestResult } from '../../lib/types';

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
    <div className="results-display-container">
      <p>Download Speed: {speedTestResults.download.toFixed(2)} Mbps</p>
      <p>Upload Speed: {speedTestResults.upload.toFixed(2)} Mbps</p>
      <p>Ping: {speedTestResults.ping.toFixed(1)} ms</p>

      <div className="buttons-container">
        <div className="buttons-row">
          <button
            onClick={() => {
              setSpeedTestResults(null);
              setIsTestRunning(false);
              setSubmissionMessage(null);
              setIframeKey(Date.now()); // Reload iframe
            }}
            className="btn btn-primary"
          >
            Test Again
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Results'}
          </button>
        </div>
        {submissionMessage && (
          <div className={`submission-message ${submissionMessage.startsWith('Error') ? 'submission-error' : 'submission-success'}`}>
            {submissionMessage}
          </div>
        )}
      </div>
    </div>
  );
} 