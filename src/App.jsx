import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import TopTabBar from './components/TopTabBar';
import LeftSidebar from './components/LeftSidebar';
import PluginRenderer from './PluginRenderer';
import GlobalComponentSearch from './components/GlobalComponentSearch';
import { useAppContext } from './context/AppContext';

export default function App() {
  const [plugins, setPlugins] = useState([]);
  const [activeTab, setActiveTab] = useState('QUOTING');
  const [themeSettings, setThemeSettings] = useState(null);
  const { openSearchModal } = useAppContext();

  // Plugin categories
  const pluginCategories = {
    'TOOLS': ['fla-calc', 'margin-calc', 'manual-bom-builder', 'number-generator', 'bom-importer'],
    'PRODUCTS': ['assembly-manager', 'product-template-manager', 'component-manager'],
    'QUOTING': ['quote-configurator', 'number-generator', 'margin-calc']
  };

  // Load and apply theme settings
  useEffect(() => {
    async function loadThemeSettings() {
      try {
        const settings = await window.api.getDashboardSettings();
        setThemeSettings(settings);
        applyTheme(settings);
      } catch (error) {
        console.error('Failed to load theme settings:', error);
        // Apply defaults if loading fails
        applyTheme({ theme: 'slate', customization: { accentColor: 'blue' } });
      }
    }
    loadThemeSettings();
  }, []);

  // Reapply theme when settings change
  useEffect(() => {
    if (themeSettings) {
      applyTheme(themeSettings);
    }
  }, [themeSettings]);

  // Apply theme to document
  const applyTheme = (settings) => {
    const root = document.documentElement;
    
    // Enable dark mode
    root.classList.add('dark');
    
    // Remove all theme classes first
    root.classList.remove('theme-slate', 'theme-zinc', 'theme-stone', 'theme-gray', 'theme-neutral');
    
    // Add selected theme class
    if (settings?.theme) {
      root.classList.add(`theme-${settings.theme}`);
    }
    
    // Apply accent color via CSS custom property
    const accentColors = {
      blue: '217 91% 60%',
      purple: '271 91% 65%',
      green: '142 71% 45%',
      orange: '25 95% 53%',
      red: '0 84% 60%'
    };
    
    const accentColor = settings?.customization?.accentColor || 'blue';
    if (accentColors[accentColor]) {
      root.style.setProperty('--accent-hsl', accentColors[accentColor]);
    }
  };

  useEffect(() => {
    async function fetchPluginRegistry() {
      try {
        const response = await fetch('/plugin_registry.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const registry = await response.json();
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

  return (
    <HashRouter>
      <div className="flex flex-col h-screen antialiased text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900">
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
