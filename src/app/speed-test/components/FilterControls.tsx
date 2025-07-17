"use client";

interface FilterControlsProps {
  filterMode: 'location' | 'radius';
  setFilterMode: (mode: 'location' | 'radius') => void;
  filterLocation: string;
  setFilterLocation: (location: string) => void;
  radius: number;
  setRadius: (radius: number) => void;
  coordinates: { lat: number, lng: number } | null;
  showMyResults: boolean;
  setShowMyResults: (show: boolean) => void;
  handleFilterChange: () => void;
  isFetchingPastResults: boolean;
}

export default function FilterControls({
  filterMode,
  setFilterMode,
  filterLocation,
  setFilterLocation,
  radius,
  setRadius,
  coordinates,
  showMyResults,
  setShowMyResults,
  handleFilterChange,
  isFetchingPastResults
}: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
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
        onClick={handleFilterChange}
        className="bg-purple-500 text-white px-4 py-1.5 rounded hover:bg-purple-600 transition-colors disabled:bg-gray-400"
        disabled={isFetchingPastResults || (filterMode === 'radius' && !coordinates)}
      >
        {isFetchingPastResults ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
} 