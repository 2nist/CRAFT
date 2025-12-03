import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import TopTabBar from './components/TopTabBar';
import LeftSidebar from './components/LeftSidebar';
import PluginRenderer from './PluginRenderer';
import GlobalComponentSearch from './components/GlobalComponentSearch';
import { useAppContext } from './context/AppContext';
import loggingService from './services/LoggingService';

export default function App() {
  const [plugins, setPlugins] = useState([]);
  const [activeTab, setActiveTab] = useState('TOOLS');
  const { openSearchModal } = useAppContext();

  // Plugin categories
  const pluginCategories = {
    'TOOLS': ['fla-calc', 'margin-calc', 'manual-bom-builder', 'number-generator'],
    'PRODUCTS': ['sub-assembly-manager', 'product-template-manager', 'component-manager', 'bom-importer'],
    'QUOTING': ['number-generator', 'margin-calc']
  };

  useEffect(() => {
    async function fetchPluginRegistry() {
      try {
        const registry = await window.api.getPluginRegistry();
        setPlugins(registry);
      } catch (error) {
        console.error("Failed to load plugin registry:", error);
      }
    }
    fetchPluginRegistry();
  }, []);

  // Filter plugins based on active tab
  const visiblePlugins = plugins.filter(plugin => 
    pluginCategories[activeTab]?.includes(plugin.id)
  );

  // Listen for IPC event to open search modal
  useEffect(() => {
    const handleOpenSearch = () => {
      openSearchModal();
    };

    // Listen for IPC message from Electron menu
    window.api?.onOpenComponentSearch?.(handleOpenSearch);

    return () => {
      // Cleanup if API provides removal
      window.api?.removeOpenComponentSearchListener?.();
    };
  }, [openSearchModal]);

  // Global keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearchModal]);

  // Listen for messages from plugins (for logging)
  useEffect(() => {
    const handlePluginMessage = (event) => {
      if (event.data && typeof event.data === 'object') {
        const { type, data } = event.data;

        if (type === 'LOG_MARGIN_ACTIVITY') {
          loggingService.logMarginActivity(
            data.action,
            data.cost,
            data.marginPercent,
            data.finalPrice,
            data.details
          );
        }
      }
    };

    window.addEventListener('message', handlePluginMessage);

    return () => {
      window.removeEventListener('message', handlePluginMessage);
    };
  }, []);

  return (
    <HashRouter>
      <div className="flex flex-col h-screen antialiased text-foreground bg-background">
        <TopTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar plugins={visiblePlugins} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Routes>
              {plugins.map((plugin) => (
                <Route
                  key={plugin.id}
                  path={plugin.path}
                  element={<PluginRenderer pluginId={plugin.id} />}
                />
              ))}
              <Route
                path="/"
                element={<PluginRenderer pluginId="hub-dashboard" />}
              />
            </Routes>
          </main>
        </div>
        
        {/* Global Component Search Modal */}
        <GlobalComponentSearch />
      </div>
    </HashRouter>
  );
}
