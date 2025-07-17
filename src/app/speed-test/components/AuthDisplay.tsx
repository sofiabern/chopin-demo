"use client";

import { useAddress } from '@chopinframework/react';

export default function AuthDisplay() {
  const { address: chopinAddress, login } = useAddress();

  return (
    <div>
      {chopinAddress ? (
        <div className="text-right">
          <p className="text-sm text-gray-600">Logged in as:</p>
          <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{chopinAddress}</p>
        </div>
      ) : (
        <button
          onClick={login}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          Login with Chopin
        </button>
      )}
    </div>
  );
} 