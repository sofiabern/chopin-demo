"use client";

import { useState } from 'react';
import { useAddress } from '@chopinframework/react';
import { useLocation } from '../lib/location';
import SpeedTestRunner from './SpeedTestRunner';
import PastResultsSection from './PastResultsSection';

export default function SpeedTestView() {
  const { location, coordinates, isLocationLoading } = useLocation();
  const { address: chopinAddress, login } = useAddress();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmissionComplete = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <>
      <div className="card location-bar">
        <div className="flex items-center">
          <p className="location-label">Location:</p>
          <p className="location-text">{isLocationLoading ? 'Determining...' : location}</p>
        </div>
      </div>

      {!chopinAddress ? (
        <div className="card login-prompt">
          <h2>Please Log In to Continue</h2>
          <p>You need to connect your Chopin wallet to perform a speed test.</p>
          <button
            onClick={login}
            className="btn btn-green login-button"
          >
            Login with Chopin
          </button>
        </div>
      ) : (
        <SpeedTestRunner
          location={location}
          coordinates={coordinates}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}

      {chopinAddress && <PastResultsSection key={refreshKey} coordinates={coordinates} />}
    </>
  );
} 