import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Search, X, Package } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { searchService } from '../../services/SearchService';
import { eventBus, EVENTS } from '../../services/EventBus';

/**
 * GlobalComponentSearch - Centralized moveable/resizable search modal
 * Default size: 600x500px, centered on screen
 */
export default function GlobalComponentSearch() {
  const { isSearchModalOpen, closeSearchModal } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchInputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('GlobalComponentSearch: isSearchModalOpen =', isSearchModalOpen);
  }, [isSearchModalOpen]);

  // Initialize search service
  useEffect(() => {
    if (isSearchModalOpen && !isInitialized) {
      const init = async () => {
        setIsLoading(true);
        await searchService.initialize();
        setIsInitialized(true);
        setIsLoading(false);
        // Start with empty results until user searches
        setResults([]);
      };
      init();
    }
  }, [isSearchModalOpen, isInitialized]);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isSearchModalOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchModalOpen]);

  // Scroll to top when results change
  useEffect(() => {
    if (resultsContainerRef.current && results.length > 0) {
      resultsContainerRef.current.scrollTop = 0;
    }
  }, [results]);

  // Handle search
  useEffect(() => {
    if (!isInitialized) return;

    const performSearch = () => {
      // Only show results when user has typed something
      if (searchQuery.trim() === '') {
        setResults([]);
      } else {
        const searchResults = searchService.search(searchQuery, { limit: 100 });
        setResults(searchResults);
      }
    };

    // Debounce search
    const timer = setTimeout(performSearch, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, isInitialized]);

  // Handle manual search button click
  const handleSearch = () => {
    if (!isInitialized || searchQuery.trim() === '') return;
    console.log('Manual search for:', searchQuery);
    const searchResults = searchService.search(searchQuery, { limit: 100 });
    console.log('Search results:', searchResults.length, searchResults.slice(0, 3));
    setResults(searchResults);
  };

  // Handle Enter key in search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle component selection
  const handleSelectComponent = (component) => {
    // Publish event for plugins to consume
    eventBus.publish(EVENTS.COMPONENT_SELECTED, component);
    
    // Optionally close modal after selection
    closeSearchModal();
    setSearchQuery('');
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && isSearchModalOpen) {
        closeSearchModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, closeSearchModal]);

  if (!isSearchModalOpen) {
    return null;
  }

  // Calculate center position
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const defaultWidth = 600;
  const defaultHeight = 500;
  const defaultX = (windowWidth - defaultWidth) / 2;
  const defaultY = (windowHeight - defaultHeight) / 2;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={closeSearchModal}
      />

      {/* Draggable/Resizable Modal */}
      <Rnd
        default={{
          x: defaultX,
          y: defaultY,
          width: defaultWidth,
          height: defaultHeight
        }}
        minWidth={400}
        minHeight={300}
        maxWidth={1200}
        maxHeight={800}
        bounds="window"
        dragHandleClassName="drag-handle"
        className="z-[9999]"
      >
        <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header - Draggable */}
          <div className="drag-handle flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 cursor-move">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Search Components</h2>
              <span className="text-sm text-gray-500">
                ({searchService.getTotalCount()} total)
              </span>
            </div>
            <button
              onClick={closeSearchModal}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search by SKU, Description, Category, Manufacturer..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Search (or press Enter)"
              >
                <Search size={16} />
                Search
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div ref={resultsContainerRef} className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Loading components...</div>
              </div>
            ) : searchQuery.trim() === '' ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Package size={48} className="mb-4 opacity-50" />
                <p className="text-lg">Start typing to search</p>
                <p className="text-sm mt-2">Search by SKU, Description, Category, or Manufacturer</p>
                <div className="mt-6 text-xs text-gray-600">
                  <p className="mb-1">💡 Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Type any part of the SKU or description</li>
                    <li>Search is case-insensitive</li>
                    <li>Results update as you type</li>
                  </ul>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Package size={48} className="mb-4 opacity-50" />
                <p className="text-lg">No components found</p>
                <p className="text-sm mt-2">Try a different search term</p>
                <p className="text-xs mt-4 text-gray-600">Searching in: {searchService.getTotalCount()} components</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {results.map((component, index) => (
                  <button
                    key={`${component.sku || 'nosku'}-${component.vendor || 'novendor'}-${component.vndrnum || index}`}
                    onClick={() => handleSelectComponent(component)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700/50 transition-colors focus:outline-none focus:bg-gray-700/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-white">
                            {component.sku || component.id || 'No SKU'}
                          </span>
                          {component.category && (
                            <span className="px-2 py-0.5 text-xs font-medium text-blue-300 bg-blue-900/50 border border-blue-700 rounded-full">
                              {component.category}
                            </span>
                          )}
                          {component.partAbbrev && (
                            <span className="px-2 py-0.5 text-xs font-medium text-green-300 bg-green-900/50 border border-green-700 rounded-full">
                              {component.partAbbrev}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 truncate mb-1">
                          {component.description || 'No description'}
                        </p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          {(component.manufacturer || component.vendor) && (
                            <span>Vendor: {component.manufacturer || component.vendor}</span>
                          )}
                          {component.price !== undefined && component.price !== null && (
                            <span>Price: ${component.price.toFixed(2)}</span>
                          )}
                          {component.quantity !== undefined && component.quantity !== null && (
                            <span>Qty: {component.quantity}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        Click to select
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-900 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {searchQuery.trim() === '' 
                  ? `${searchService.getTotalCount()} components available` 
                  : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
              </span>
              <span>Press <kbd className="px-1 py-0.5 bg-gray-700 rounded">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      </Rnd>
    </>
  );
}
