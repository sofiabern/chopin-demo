import { SpeedTestResult } from './types';
import { SPEED_TEST_CONFIG } from './config';

interface MessageListenerParams {
  setSpeedTestResults: (results: SpeedTestResult | null) => void;
  setError: (error: string | null) => void;
  setIsTestRunning: (isRunning: boolean) => void;
}

export const setupMessageListener = ({
  setSpeedTestResults,
  setError,
  setIsTestRunning,
}: MessageListenerParams) => {
  const handleMessage = (event: MessageEvent) => {
    // Log every message that comes through for debugging
    console.log('Parent page: Received message:', {
      origin: event.origin,
      data: event.data,
    });

    // Check origin for security
    const expectedOrigin = new URL(SPEED_TEST_CONFIG.server).origin;
    if (event.origin !== expectedOrigin) {
      console.warn(`Parent page: Ignored message from unexpected origin: ${event.origin}, expected: ${expectedOrigin}`);
      return;
    }

    // Handle test started message
    if (event.data && event.data.message === 'test_started') {
      console.log('Parent page: Test started message received, updating state.');
      setSpeedTestResults(null);
      setError(null);
      setIsTestRunning(true);
    }

    if (event.data && event.data.message === 'test_completed') {
      console.log('Parent page: Test completed message received, updating state.');
      const results = event.data.results;
      setSpeedTestResults({
        download: parseFloat(results.download),
        upload: parseFloat(results.upload),
        ping: parseFloat(results.ping),
      });
      setIsTestRunning(false);
    }
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}; 