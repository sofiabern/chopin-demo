"use client";

import { useState, useEffect, useCallback } from 'react';
import FilterControls from './FilterControls';
import PastResultsTable from './PastResultsTable';
import { PastSpeedTestResult } from '../../lib/types';

interface PastResultsSectionProps {
    coordinates: { lat: number; lng: number } | null;
}

export default function PastResultsSection({ coordinates }: PastResultsSectionProps) {
    const [pastResults, setPastResults] = useState<PastSpeedTestResult[]>([]);
    const [isFetchingPastResults, setIsFetchingPastResults] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterLocation, setFilterLocation] = useState('');
    const [showMyResults, setShowMyResults] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, totalResults: 0 });
    const [filterMode, setFilterMode] = useState<'location' | 'radius'>('location');
    const [radius, setRadius] = useState<number>(10);

    const fetchPastResults = useCallback(async (page = 1) => {
        setIsFetchingPastResults(true);
        setPastResults([]);
        setError(null);
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
            
            // Handle empty or invalid JSON responses
            let data;
            try {
                const text = await response.text();
                data = text ? JSON.parse(text) : { results: [], pagination: { page: 1, pageSize: 10, totalResults: 0, totalPages: 0 } };
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                throw new Error('Invalid response from server');
            }

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
    }, [filterMode, filterLocation, coordinates, radius, showMyResults, pagination.pageSize]);

    useEffect(() => {
        fetchPastResults(1);
    }, [fetchPastResults]);

    const handleFilterChange = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchPastResults(1);
    };

    return (
        <div className="past-results-section">
            <h2 className="past-results-title">Past Results</h2>
            <div className="card">
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
            
            {error && (
                <div className="past-results-error">
                    {`Error: ${error}`}
                </div>
            )}

            {isFetchingPastResults && (
                <div className="past-results-loading">
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

            {pastResults.length === 0 && !isFetchingPastResults && !error && (
                <div className="past-results-empty">
                    <p>No past results found for the current filters.</p>
                </div>
            )}
        </div>
    );
} 