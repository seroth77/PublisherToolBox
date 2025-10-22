import React from 'react';
import './FilterControls.css';

export default function FilterControls({ 
  search, 
  onSearchChange, 
  platforms,
  countries,
  selectedPlatforms,
  selectedCountries,
  paidContentFilter,
  sortOption,
  onPlatformToggle,
  onCountryToggle,
  onPaidContentChange,
  onSortChange,
  onClearFilters,
  totalResults,
  filteredCount
}) {
  return (
    <div className="filter-controls">
      <div className="search-box">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, channel, games..."
          className="search-input"
        />
        <div className="results-count">
          Showing {filteredCount} of {totalResults} creators
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <h3>Filter by Platform</h3>
          <div className="checkbox-group">
            {platforms.map(platform => (
              <label key={platform} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => onPlatformToggle(platform)}
                />
                {platform}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>Filter by Country/Region</h3>
          <div className="checkbox-group">
            {countries.map(country => (
              <label key={country} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedCountries.includes(country)}
                  onChange={() => onCountryToggle(country)}
                />
                {country}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>Content Type</h3>
          <select 
            value={paidContentFilter} 
            onChange={(e) => onPaidContentChange(e.target.value)}
            className="select-filter"
          >
            <option value="all">All Content Types</option>
            <option value="free">Free Content Only</option>
            <option value="paid">Paid Content Available</option>
          </select>
        </div>

        <div className="filter-group">
          <h3>Sort By</h3>
          <select 
            value={sortOption} 
            onChange={(e) => onSortChange(e.target.value)}
            className="select-filter"
          >
            <option value="nameAsc">Name (A-Z)</option>
            <option value="nameDesc">Name (Z-A)</option>
            <option value="country">Country</option>
            <option value="platformCount">Number of Platforms</option>
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button 
          onClick={onClearFilters}
          className="clear-filters-btn"
          disabled={!search && !selectedPlatforms.length && !selectedCountries.length && paidContentFilter === 'all'}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}