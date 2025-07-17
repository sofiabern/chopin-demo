"use client";

import { useState, useEffect } from 'react';
import { useRef } from 'react';

// OpenSpeedTest widget configuration
const SPEED_TEST_CONFIG = {
  width: '100%',
  height: '600px',
  theme: 'light',
  language: 'en',
  server: process.env.NEXT_PUBLIC_SPEEDTEST_SERVER_URL || 'http://localhost:8080' // Using self-hosted server
};

// Custom event types for OpenSpeedTest
interface SpeedTestResult {
  download: number;
  upload: number;
  ping: number;
}

interface PastSpeedTestResult {
  id: number;
  location: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  timestamp: string;
}

interface SpeedTestError {
  message: string;
  code: number;
}

interface SpeedTestEventMap {
  'speedtest:complete': CustomEvent<SpeedTestResult>;
  'speedtest:error': CustomEvent<SpeedTestError>;
}



// Location formatting utilities
const formatLocation = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await response.json();
    
    // Format as City, Region, Country
    const components = data.address;
    return `${components.city || components.town || components.village || 'Unknown'}, ${components.state || components.county || 'Unknown'}, ${components.country}`;
  } catch (error) {
    console.error('Error formatting location:', error);
    return 'Location not available';
  }
};

// Get IP-based location
const getIpLocation = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return `${data.city}, ${data.region}, ${data.country_name}`;
  } catch (error) {
    console.error('Error getting IP location:', error);
    return 'Location not available';
  }
};

export default function SpeedTestPage() {
  const [location, setLocation] = useState('');
  const [speedTestResults, setSpeedTestResults] = useState<SpeedTestResult | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [pastResults, setPastResults] = useState<PastSpeedTestResult[]>([]);
  const [isFetchingPastResults, setIsFetchingPastResults] = useState(false);
  const [chopinAddress, setChopinAddress] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);


  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (response.ok && data.address) {
          setChopinAddress(data.address);
        }
      } catch (err) {
        console.error('Failed to fetch auth status:', err);
      }
    };
    fetchAuthStatus();
  }, []);

  // Get browser location with fallback
  useEffect(() => {
    const getLocation = async () => {
      setIsLocationLoading(true);
      try {
        // Check if geolocation is available
        if (navigator.geolocation) {
          setIsGeolocationAvailable(true);
          
          // Try to get GPS location first
          const position = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              (err) => {
                console.error('GPS error, falling back to IP location:', err);
                // Fall back to IP location
                getIpLocation().then(setLocation).finally(() => resolve(null));
              },
              { timeout: 5000 }
            );
          });

          if (position) {
            // Format location using coordinates
            const formattedLocation = await formatLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            setLocation(formattedLocation);
          }
        } else {
          // Use IP location if geolocation is not available
          const ipLocation = await getIpLocation();
          setLocation(ipLocation);
        }
      } catch (err) {
        console.error('Error getting location:', err);
        setLocation('Location not available');
      } finally {
        setIsLocationLoading(false);
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log every message that comes through for debugging
      console.log('Parent page: Received message:', {
        origin: event.origin,
        data: event.data,
      });

      // Check origin for security (simplified for direct index.html communication)
      const expectedOrigin = new URL(SPEED_TEST_CONFIG.server).origin;
      const isValidOrigin = event.origin === expectedOrigin || 
                           event.origin === 'http://localhost:8080' || 
                           event.origin === 'http://127.0.0.1:8080';
      
      if (!isValidOrigin) {
        console.warn(`Parent page: Ignored message from unexpected origin: ${event.origin}, expected: ${expectedOrigin}`);
        return;
      }

      // Handle pong response
      if (event.data && event.data.message === 'pong') {
        console.log('Parent page: Received pong response from widget!');
        return;
      }

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
  }, []);

  const handlePingIframe = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const targetOrigin = SPEED_TEST_CONFIG.server;
      console.log(`Parent page: Sending 'ping' to iframe with target origin: ${targetOrigin}`);
      iframeRef.current.contentWindow.postMessage({ message: 'ping' }, targetOrigin);
    } else {
      console.error('Parent page: Cannot send ping, iframe not available.');
    }
  };

  const handleSubmit = async () => {
    if (!speedTestResults) return;

    setIsSubmitting(true);
    setSubmissionMessage(null);

    try {
            const response = await fetch('/api/speed-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          download_speed: speedTestResults.download,
          upload_speed: speedTestResults.upload,
          ping: speedTestResults.ping,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit results');
      }

      setSubmissionMessage('Results submitted successfully!');
      // Automatically refresh the past results list
      await fetchPastResults();
    } catch (err) {
      if (err instanceof Error) {
        setSubmissionMessage(`Error: ${err.message}`);
      } else {
        setSubmissionMessage('An unknown error occurred during submission.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchPastResults = async () => {
    if (!location || location === 'Location not available') return;

    setIsFetchingPastResults(true);
    setPastResults([]);
    try {
      const response = await fetch(`/api/speed-test?location=${encodeURIComponent(location)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch past results');
      }

      setPastResults(data.results);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error fetching past results: ${err.message}`);
      } else {
        setError('An unknown error occurred while fetching past results.');
      }
    } finally {
      setIsFetchingPastResults(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4">WiFi Speed Test</h1>
        <button onClick={handlePingIframe} className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Ping Iframe (for debugging)
        </button>
        <p className="mb-2">Your Chopin wallet address: {chopinAddress ? <span className="font-mono">{chopinAddress}</span> : 'Loading...'}</p>
        {chopinAddress ? (
          <div className="text-right">
            <p className="text-sm text-gray-600">Logged in as:</p>
            <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{chopinAddress}</p>
          </div>
        ) : (
          <a href="/_chopin/login" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
            Login with Chopin
          </a>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Location:
        </label>
        <input
          type="text"
          value={isLocationLoading ? 'Determining your location...' : location}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          readOnly
        />
        <button
          onClick={fetchPastResults}
          className="mt-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors disabled:bg-gray-300"
          disabled={isFetchingPastResults || isLocationLoading || !location || location === 'Location not available'}
        >
          {isFetchingPastResults ? 'Loading History...' : 'Get Past Results for this Location'}
        </button>
      </div>

      {!speedTestResults && (
        <div className="mt-4">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={`${SPEED_TEST_CONFIG.server}/index.html`}
            width={SPEED_TEST_CONFIG.width}
            height={SPEED_TEST_CONFIG.height}
            frameBorder="0"
            className="w-full"
            title="OpenSpeedTest"
          ></iframe>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isTestRunning && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p>Test in progress, waiting for results...</p>
        </div>
      )}

      {speedTestResults && (
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
      )}

      {isFetchingPastResults && (
        <div className="mt-4 text-center">
          <p>Loading past results...</p>
        </div>
      )}

      {pastResults.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Past Results for {location}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b">Timestamp</th>
                  <th className="py-2 px-4 border-b">Download (Mbps)</th>
                  <th className="py-2 px-4 border-b">Upload (Mbps)</th>
                  <th className="py-2 px-4 border-b">Ping (ms)</th>
                </tr>
              </thead>
              <tbody>
                {pastResults.map((result) => (
                  <tr key={result.id} className="text-center">
                    <td className="py-2 px-4 border-b">{new Date(result.timestamp + 'Z').toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })}</td>
                    <td className="py-2 px-4 border-b">{result.download_speed.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b">{result.upload_speed.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b">{result.ping.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pastResults.length === 0 && !isFetchingPastResults && !isLocationLoading && location !== '' && location !== 'Location not available' && (
        <div className="mt-4">
          <p>No past results found for this location. Click the button above to check.</p>
        </div>
      )}
    </div>
  );
}
