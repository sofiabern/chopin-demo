"use client";

import { useState, useEffect, useRef } from 'react';
import { useAddress } from '@chopinframework/react';
import AuthDisplay from './components/AuthDisplay';
import FilterControls from './components/FilterControls';
import ResultsDisplay from './components/ResultsDisplay';
import PastResultsTable from './components/PastResultsTable';
import { SpeedTestResult, PastSpeedTestResult } from './lib/types';
import { fetchAndFormatLocation } from './lib/location';
import { SPEED_TEST_CONFIG } from './lib/config';
import { submitSpeedTestResults } from './lib/api';
import { setupMessageListener } from './lib/iframe';

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
  const { address: chopinAddress, login } = useAddress();
  const [filterLocation, setFilterLocation] = useState('');
  const [showMyResults, setShowMyResults] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, totalResults: 0 });
  const [filterMode, setFilterMode] = useState<'location' | 'radius'>('location');
  const [radius, setRadius] = useState<number>(10);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [aspectRatio, setAspectRatio] = useState(getAspectRatio());

  function getAspectRatio() {
    if (typeof window === 'undefined') {
      return 9 / 16; // Default to landscape for SSR
    }
    return window.innerHeight > window.innerWidth ? 16 / 9 : 9 / 16;
  }

  useEffect(() => {
    const handleResize = () => {
      setAspectRatio(getAspectRatio());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    fetchPastResults();
  }, []);

  // Get browser location with fallback
  useEffect(() => {
    const getLocation = async () => {
      setIsLocationLoading(true);
      const { location, coordinates, isGeolocationAvailable } = await fetchAndFormatLocation();
      setLocation(location);
      setCoordinates(coordinates);
      setIsGeolocationAvailable(isGeolocationAvailable);
      setIsLocationLoading(false);
    };

    getLocation();
  }, []);

  useEffect(() => {
    const cleanup = setupMessageListener({
      setSpeedTestResults,
      setError,
      setIsTestRunning,
    });
    return cleanup;
  }, []);

  const handleSubmit = async () => {
    if (!speedTestResults) return;

    setIsSubmitting(true);
    setSubmissionMessage(null);

    const result = await submitSpeedTestResults({
      location,
      speedTestResults,
      coordinates
    });

    setSubmissionMessage(result.message);

    if (result.success) {
      // Automatically refresh the past results list
      await fetchPastResults();
    }

    setIsSubmitting(false);
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
        <AuthDisplay />
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
          <FilterControls
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            filterLocation={filterLocation}
            setFilterLocation={setFilterLocation}
            radius={radius}
            setRadius={setRadius}
            coordinates={coordinates}
            showMyResults={showMyResults}
            setShowMyResults={setShowMyResults}
            handleFilterChange={handleFilterChange}
            isFetchingPastResults={isFetchingPastResults}
          />
        </div>
      </div>

      {!chopinAddress ? (
        <div className="text-center mt-8 p-8 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Please Log In to Continue</h2>
          <p className="text-gray-600 mb-6">You need to connect your Chopin wallet to perform a speed test.</p>
          <button
            onClick={login}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-md"
          >
            Login with Chopin
          </button>
        </div>
      ) : (
        <>
          {!speedTestResults && (
            <div className="mt-4">
              <div style={{ position: 'relative', width: '100%', paddingTop: `${aspectRatio * 100}%` }}>
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={`${SPEED_TEST_CONFIG.server}/index.html`}
                  frameBorder="0"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transformOrigin: 'top left',
                  }}
                  className="w-full h-full"
                  title="OpenSpeedTest"
                ></iframe>
              </div>
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
            <ResultsDisplay
              speedTestResults={speedTestResults}
              setSpeedTestResults={setSpeedTestResults}
              setIsTestRunning={setIsTestRunning}
              setSubmissionMessage={setSubmissionMessage}
              setIframeKey={setIframeKey}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submissionMessage={submissionMessage}
            />
          )}
        </>
      )}

      {isFetchingPastResults && (
        <div className="mt-4 text-center">
          <p>Loading past results...</p>
        </div>
      )}

      {pastResults.length > 0 && (
        <PastResultsTable
          pastResults={pastResults}
          pagination={pagination}
          fetchPastResults={fetchPastResults}
          isFetchingPastResults={isFetchingPastResults}
        />
      )}

      {pastResults.length === 0 && !isFetchingPastResults && (
        <div className="mt-4">
          <p>No past results found for the current filters.</p>
        </div>
      )}
    </div>
  );
}