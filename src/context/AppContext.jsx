import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const AppContext = createContext(null);

/**
 * AppContext Provider
 * Manages global application state including modal visibility
 */
export function AppProvider({ children }) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const openSearchModal = useCallback(() => {
    setIsSearchModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setIsSearchModalOpen(false);
  }, []);

  const toggleSearchModal = useCallback(() => {
    setIsSearchModalOpen(prev => !prev);
  }, []);

  const value = {
    isSearchModalOpen,
    openSearchModal,
    closeSearchModal,
    toggleSearchModal
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access app context
 * @returns {Object} App context value
 */
export function useAppContext() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  
  return context;
}

export default AppContext;
