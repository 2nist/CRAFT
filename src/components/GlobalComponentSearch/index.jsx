import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Search, X, Package, Info, Copy, CheckCircle, BookOpen, Download, ExternalLink } from 'lucide-react';
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
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [manualStatus, setManualStatus] = useState(null); // 'checking', 'found', 'searching', 'confirm-save'
  const [manualUrl, setManualUrl] = useState(null);
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
    // Show detail dialog instead of closing immediately
    setSelectedComponent(component);
    setShowDetailDialog(true);
  };

  // Handle using the selected component
  const handleUseComponent = () => {
    if (selectedComponent) {
      // Publish event for plugins to consume
      eventBus.publish(EVENTS.COMPONENT_SELECTED, selectedComponent);
      
      // Close detail dialog and reset search
      setShowDetailDialog(false);
      setSelectedComponent(null);
      closeSearchModal();
      setSearchQuery('');
    }
  };

  // Handle copying component data
  const handleCopyComponent = () => {
    if (selectedComponent) {
      const data = JSON.stringify(selectedComponent, null, 2);
      navigator.clipboard.writeText(data);
    }
  };

  // Smart Manual Handler - Check local, then search, then save
  const handleViewManual = async () => {
    if (!selectedComponent) return;
    
    // Check if manual API is available
    if (!window.manuals) {
      alert('Manual system not available. Please restart the application.');
      return;
    }
    
    setManualStatus('checking');
    
    try {
      // Step 1: Check if manual exists locally
      const localCheck = await window.manuals.checkLocal({
        sku: selectedComponent.sku,
        manufacturer: selectedComponent.manufacturer || selectedComponent.vendor,
        description: selectedComponent.description
      });
      
      if (localCheck.found) {
        // Manual exists - open it
        setManualStatus('found');
        await window.manuals.openLocal(localCheck.path);
        setTimeout(() => setManualStatus(null), 2000);
        return;
      }
      
      // Step 2: Manual not found - do smart search
      setManualStatus('searching');
      const searchResult = await window.manuals.smartSearch({
        sku: selectedComponent.sku,
        manufacturer: selectedComponent.manufacturer || selectedComponent.vendor,
        vndrnum: selectedComponent.vndrnum,
        description: selectedComponent.description
      });
      
      if (searchResult.url) {
        // Open browser with search results
        setManualUrl(searchResult.url);
        setManualStatus('confirm-save');
        await window.api.openExternal(searchResult.url);
      } else {
        setManualStatus(null);
        alert('Could not find manual online. Please search manually.');
      }
      
    } catch (error) {
      console.error('Manual handler error:', error);
      setManualStatus(null);
      alert('Error accessing manual system.');
    }
  };

  // Confirm and save manual
  const handleSaveManual = async (confirmed) => {
    if (!confirmed || !selectedComponent) {
      setManualStatus(null);
      setManualUrl(null);
      return;
    }
    
    try {
      // User confirmed - save the manual URL/info
      await window.manuals.saveManualReference({
        sku: selectedComponent.sku,
        manufacturer: selectedComponent.manufacturer || selectedComponent.vendor,
        manualUrl: manualUrl,
        savedDate: new Date().toISOString()
      });
      
      setManualStatus('found');
      setTimeout(() => {
        setManualStatus(null);
        setManualUrl(null);
      }, 2000);
      
    } catch (error) {
      console.error('Save manual error:', error);
      setManualStatus(null);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && isSearchModalOpen) {
        // If detail dialog is open, close it first
        if (showDetailDialog) {
          setShowDetailDialog(false);
          setSelectedComponent(null);
        } else {
          closeSearchModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, closeSearchModal, showDetailDialog]);

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
      {/* Backdrop - Don't close on click */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
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

      {/* Component Detail Dialog */}
      {showDetailDialog && selectedComponent && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDetailDialog(false)} />
          <div className="relative bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Info size={24} className="text-blue-400" />
                <h3 className="text-xl font-semibold text-white">Component Details</h3>
              </div>
              <button
                onClick={() => setShowDetailDialog(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
              {/* SKU and Category */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-2xl font-bold text-white">
                    {selectedComponent.sku || selectedComponent.id || 'No SKU'}
                  </span>
                  {selectedComponent.category && (
                    <span className="px-3 py-1 text-sm font-medium text-blue-300 bg-blue-900/50 border border-blue-700 rounded-full">
                      {selectedComponent.category}
                    </span>
                  )}
                  {selectedComponent.partAbbrev && (
                    <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 border border-green-700 rounded-full">
                      {selectedComponent.partAbbrev}
                    </span>
                  )}
                </div>
                <p className="text-lg text-gray-300">
                  {selectedComponent.description || 'No description available'}
                </p>
              </div>

              {/* Component Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(selectedComponent.manufacturer || selectedComponent.vendor) && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Manufacturer/Vendor</div>
                    <div className="text-white font-medium">
                      {selectedComponent.manufacturer || selectedComponent.vendor}
                    </div>
                  </div>
                )}

                {selectedComponent.vndrnum && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Vendor Part #</div>
                    <div className="text-white font-medium font-mono">{selectedComponent.vndrnum}</div>
                  </div>
                )}

                {(selectedComponent.price !== undefined && selectedComponent.price !== null) && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Price</div>
                    <div className="text-green-400 font-bold text-xl">
                      ${selectedComponent.price.toFixed(2)}
                    </div>
                  </div>
                )}

                {(selectedComponent.quantity !== undefined && selectedComponent.quantity !== null) && (
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Quantity</div>
                    <div className="text-white font-medium">{selectedComponent.quantity}</div>
                  </div>
                )}
              </div>

              {/* All Fields (for debugging/completeness) */}
              <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700">
                <div className="text-xs text-gray-500 mb-2">All Fields:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedComponent).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-gray-500">{key}:</span>
                      <span className="text-gray-300 truncate">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-t border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={handleCopyComponent}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy Data
                </button>
                <button
                  onClick={handleViewManual}
                  disabled={manualStatus === 'checking' || manualStatus === 'searching'}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {manualStatus === 'checking' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Checking...
                    </>
                  )}
                  {manualStatus === 'searching' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Searching...
                    </>
                  )}
                  {manualStatus === 'found' && (
                    <>
                      <CheckCircle size={16} />
                      Found!
                    </>
                  )}
                  {!manualStatus && (
                    <>
                      <BookOpen size={16} />
                      View Manual
                    </>
                  )}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetailDialog(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUseComponent}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Use Component
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Save Confirmation Dialog */}
      {manualStatus === 'confirm-save' && (
        <div className="fixed inset-0 flex items-center justify-center z-[10001]">
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full mx-4">
            <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Download size={20} className="text-green-400" />
                Manual Found - Confirm to Save
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                I opened a browser with search results for <span className="font-mono text-blue-400">{selectedComponent?.sku}</span>.
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Is this the correct manual? Click <strong>Save Reference</strong> to remember this location for next time.
              </p>
              <div className="bg-blue-900/20 border border-blue-700 rounded p-3 mb-4">
                <p className="text-xs text-blue-300">
                  💡 Next time you click "View Manual" for this component, it will open directly!
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-900 border-t border-gray-700">
              <button
                onClick={() => handleSaveManual(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Not the Right Manual
              </button>
              <button
                onClick={() => handleSaveManual(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Save Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
