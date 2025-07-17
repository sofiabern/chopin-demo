"use client";

import { PastSpeedTestResult } from '../lib/types';

interface PastResultsTableProps {
  pastResults: PastSpeedTestResult[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalResults: number;
  };
  fetchPastResults: (page: number) => void;
  isFetchingPastResults: boolean;
}

export default function PastResultsTable({
  pastResults,
  pagination,
  fetchPastResults,
  isFetchingPastResults
}: PastResultsTableProps) {
  return (
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
  );
} 