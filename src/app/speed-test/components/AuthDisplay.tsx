"use client";

import { useAddress } from '@chopinframework/react';

export default function AuthDisplay() {
  const { address: chopinAddress, login } = useAddress();

  return (
    <div className="auth-display">
      {chopinAddress ? (
        <div className="logged-in-container">
          <p className="logged-in-label">Logged in as:</p>
          <p className="address-display">{chopinAddress}</p>
        </div>
      ) : (
        <button
          onClick={login}
          className="btn btn-green"
        >
          Login with Chopin
        </button>
      )}
    </div>
  );
} 