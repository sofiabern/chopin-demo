"use client";
interface FilterControlsProps {
  filterMode: "location" | "country" | "city" | "radius";
  setFilterMode: (mode: "location" | "country" | "city" | "radius") => void;
  filterLocation: string;
  setFilterLocation: (location: string) => void;
  filterCountry: string;
  setFilterCountry: (country: string) => void;
  filterCity: string;
  setFilterCity: (city: string) => void;
  radius: number;
  setRadius: (radius: number) => void;
  coordinates: { lat: number; lng: number } | null;
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
  filterCountry,
  setFilterCountry,
  filterCity,
  setFilterCity,
  radius,
  setRadius,
  coordinates,
  showMyResults,
  setShowMyResults,
  handleFilterChange,
  isFetchingPastResults,
}: FilterControlsProps) {
  return (
    <div className="filter-controls-container">
      <div className="filter-group">
        <p className="filter-group-label">Filter by:</p>
        <select
          value={filterMode}
          onChange={(e) =>
            setFilterMode(
              e.target.value as "location" | "country" | "city" | "radius"
            )
          }
          className="select-field"
        >
          <option value="location">Location</option>
          <option value="country">Country</option>
          <option value="city">City</option>
          <option value="radius">Radius</option>
        </select>

        {["location", "country", "city"].includes(filterMode) ? (
          <input
            type="text"
            placeholder={
              filterMode === "country"
                ? "e.g., Brazil"
                : filterMode === "city"
                ? "e.g., São Paulo"
                : "e.g., Brazil, São Paulo"
            }
            value={
              filterMode === "country"
                ? filterCountry
                : filterMode === "city"
                ? filterCity
                : filterLocation
            }
            onChange={(e) => {
              if (filterMode === "country") setFilterCountry(e.target.value);
              else if (filterMode === "city") setFilterCity(e.target.value);
              else setFilterLocation(e.target.value);
            }}
            className="input-field location-input"
          />
        ) : (
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="select-field"
            disabled={!coordinates}
          >
            <option value={5}>5 km</option>
            <option value={25}>25 km</option>
            <option value={100}>100 km</option>
            <option value={500}>500 km</option>
          </select>
        )}
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={showMyResults}
          onChange={(e) => setShowMyResults(e.target.checked)}
          className="checkbox"
        />
        <span className="checkbox-text">My Results</span>
      </label>

      <button
        onClick={handleFilterChange}
        className="btn search-button"
        disabled={
          isFetchingPastResults || (filterMode === "radius" && !coordinates)
        }
      >
        {isFetchingPastResults ? "Searching..." : "Search"}
      </button>
    </div>
  );
}
