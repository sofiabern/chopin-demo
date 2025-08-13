"use client";

import { PastSpeedTestResult } from '../../lib/types';

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
    <div className="table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Timestamp</th>
            <th>Location</th>
            <th>Download (Mbps)</th>
            <th>Upload (Mbps)</th>
            <th>Ping (ms)</th>
          </tr>
        </thead>
        <tbody>
          {pastResults.map((result, index) => (
            <tr key={result.id}>
              <td>{index + 1}</td>
              <td>{new Date(result.timestamp).toLocaleString()}</td>
              <td>{result.location}</td>
              <td>{result.download_speed.toFixed(2)}</td>
              <td>{result.upload_speed.toFixed(2)}</td>
              <td>{result.ping.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination-controls">
        <button
          onClick={() => fetchPastResults(pagination.page - 1)}
          disabled={pagination.page <= 1 || isFetchingPastResults}
          className="btn"
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => fetchPastResults(pagination.page + 1)}
          disabled={
            pagination.page >= pagination.totalPages || isFetchingPastResults
          }
          className="btn"
        >
          Next
        </button>
      </div>
    </div>
  );
} 