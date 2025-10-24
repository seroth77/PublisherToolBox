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
  designerView,
  onPlatformToggle,
  onCountryToggle,
  onPaidContentChange,
  onSortChange,
  onDesignerViewChange,
  onClearFilters,
  totalResults,
  filteredCount
}) {
  return (
    <div className="filter-controls">
      <div className="search-box">
        <label htmlFor="creator-search" className="sr-only">Search creators</label>
        <input
          id="creator-search"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, channel, games..."
          className="search-input"
        />
        <div className="results-count" role="status" aria-live="polite" aria-atomic="true">
          Showing {filteredCount} of {totalResults} creators
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <h3 id="platforms-heading">Filter by Platform</h3>
          <div className="checkbox-group" role="group" aria-labelledby="platforms-heading">
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
          <h3 id="countries-heading">Filter by Country/Region</h3>
          <div className="checkbox-group" role="group" aria-labelledby="countries-heading">
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

        {designerView && (
          <div className="filter-group">
            <h3 id="content-type-heading">Content Type</h3>
            <div className="radio-group" role="radiogroup" aria-labelledby="content-type-heading">
              <label className="filter-radio">
                <input
                  type="radio"
                  name="content-type"
                  value="all"
                  checked={paidContentFilter === 'all'}
                  onChange={(e) => onPaidContentChange(e.target.value)}
                />
                All Content Types
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="content-type"
                  value="free"
                  checked={paidContentFilter === 'free'}
                  onChange={(e) => onPaidContentChange(e.target.value)}
                />
                Free Content Only
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="content-type"
                  value="paid"
                  checked={paidContentFilter === 'paid'}
                  onChange={(e) => onPaidContentChange(e.target.value)}
                />
                Paid Content Available
              </label>
            </div>
          </div>
        )}

        <div className="filter-group">
          <h3 id="designer-view-heading">Designer View</h3>
          <div role="group" aria-labelledby="designer-view-heading">
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                aria-checked={designerView}
                checked={designerView}
                onChange={(e) => onDesignerViewChange(e.target.checked)}
              />
              <span className="switch-slider" aria-hidden="true"></span>
              <span className="switch-label">Designer view</span>
            </label>
          </div>
        </div>

        <div className="filter-group">
          <h3>Sort By</h3>
          <select 
            value={sortOption} 
            onChange={(e) => onSortChange(e.target.value)}
            className="select-filter"
            aria-label="Sort By"
          >
            <option value="nameAsc">Name (A-Z)</option>
            <option value="nameDesc">Name (Z-A)</option>
            <option value="country">Country</option>
            <option value="platformCount">Number of Platforms</option>
            <option value="subscribersDesc">Subscribers (High to Low)</option>
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button 
          onClick={onClearFilters}
          className="clear-filters-btn"
          disabled={!search && !selectedPlatforms.length && !selectedCountries.length && (designerView ? paidContentFilter === 'all' : true)}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}