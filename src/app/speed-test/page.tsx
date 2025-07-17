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
  const [coordinates, setCoordinates] = useState<{ lat: number, lng: number } | null>(null);
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
  const [filterLocation, setFilterLocation] = useState('');
  const [showMyResults, setShowMyResults] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, totalResults: 0 });
  const [filterMode, setFilterMode] = useState<'location' | 'radius'>('location');
  const [radius, setRadius] = useState<number>(10);
  const iframeRef = useRef<HTMLIFrameElement>(null);


  useEffect(() => {
    fetchPastResults();
  }, []);

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
                resolve(null);
              },
              { timeout: 5000 }
            );
          });

          if (position) {
            setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
            const formattedLocation = await formatLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            setLocation(formattedLocation);
          } else {
            const ipLocation = await getIpLocation();
            setLocation(ipLocation);
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
  }, []);

  const handleSubmit = async () => {
    if (!speedTestResults || !coordinates) return;

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
          latitude: coordinates.lat,
          longitude: coordinates.lng
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

  const fetchPastResults = async (page = 1) => {
    setIsFetchingPastResults(true);
    setPastResults([]);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filterMode === 'location' && filterLocation) {
        params.append('location', filterLocation);
      } else if (filterMode === 'radius' && coordinates) {
        params.append('radius', radius.toString());
        params.append('latitude', coordinates.lat.toString());
        params.append('longitude', coordinates.lng.toString());
      }

      if (showMyResults) {
        params.append('me', 'true');
      }

      const response = await fetch(`/api/speed-test?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch past results');
      }
      setPastResults(data.results);
      setPagination(data.pagination);
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

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPastResults(1);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4">WiFi Speed Test</h1>
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

      <div className="mb-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {/* Current Location */}
          <div className="flex items-center">
            <p className="font-bold mr-2">Location:</p>
            <p className="text-gray-700">{isLocationLoading ? 'Determining...' : location}</p>
          </div>

          {/* Vertical separator */}
          <div className="border-l h-6 border-gray-300 self-center"></div>

          {/* Filter controls */}
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-700">Filter by:</p>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as 'location' | 'radius')}
              className="shadow-sm border rounded py-1 px-2 text-gray-700 bg-white"
            >
              <option value="location">Name</option>
              <option value="radius">Radius</option>
            </select>

            {filterMode === 'location' ? (
              <input
                type="text"
                placeholder="e.g., Brazil"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="shadow-sm appearance-none border rounded w-48 py-1 px-2 text-gray-700"
              />
            ) : (
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="shadow-sm border rounded py-1 px-2 text-gray-700 bg-white"
                disabled={!coordinates}
              >
                <option value={5}>5 km</option>
                <option value={25}>25 km</option>
                <option value={100}>100 km</option>
                <option value={500}>500 km</option>
              </select>
            )}
          </div>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMyResults}
              onChange={(e) => setShowMyResults(e.target.checked)}
              className="form-checkbox h-4 w-4 text-purple-600 rounded"
            />
            <span className="text-gray-700">My Results</span>
          </label>

          {/* Search Button */}
          <button
            onClick={() => handleFilterChange()}
            className="bg-purple-500 text-white px-4 py-1.5 rounded hover:bg-purple-600 transition-colors disabled:bg-gray-400"
            disabled={isFetchingPastResults || (filterMode === 'radius' && !coordinates)}
          >
            {isFetchingPastResults ? 'Searching...' : 'Search'}
          </button>
        </div>
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
          <h2 className="text-xl font-bold mb-4">Past Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b">Timestamp</th>
                  <th className="py-2 px-4 border-b">Location</th>
                  <th className="py-2 px-4 border-b">Download (Mbps)</th>
                  <th className="py-2 px-4 border-b">Upload (Mbps)</th>
                  <th className="py-2 px-4 border-b">Ping (ms)</th>
                </tr>
              </thead>
              <tbody>
                {pastResults.map((result) => (
                  <tr key={result.id} className="text-center">
                    <td className="py-2 px-4 border-b">{new Date(result.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4 border-b">{result.location}</td>
                    <td className="py-2 px-4 border-b">{result.download_speed.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b">{result.upload_speed.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b">{result.ping.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => fetchPastResults(pagination.page - 1)}
              disabled={pagination.page <= 1 || isFetchingPastResults}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchPastResults(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isFetchingPastResults}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {pastResults.length === 0 && !isFetchingPastResults && (
        <div className="mt-4">
          <p>No past results found for the current filters.</p>
        </div>
      )}
    </div>
  );
}
