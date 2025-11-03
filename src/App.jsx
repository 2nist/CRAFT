import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import LeftSidebar from './components/TopBar';
import PluginRenderer from './PluginRenderer';

export default function App() {
  const [plugins, setPlugins] = useState([]);

  // Enable dark mode on the html element
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    async function fetchPluginRegistry() {
      console.log('=== FETCH PLUGIN REGISTRY START ===');
      try {
        console.log('Fetching from /plugin_registry.json');
        const response = await fetch('/plugin_registry.json');
        console.log('Response:', response);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('Response text length:', text.length);
        console.log('Response text preview:', text.substring(0, 100));
        
        const registry = JSON.parse(text);
        console.log('Parsed registry:', registry);
        console.log('Registry length:', registry.length);
        console.log('Setting plugins state...');
        setPlugins(registry);
        console.log('Plugins state set!');
      } catch (error) {
        console.error("=== ERROR ===");
        console.error("Failed to load plugin registry:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      console.log('=== FETCH PLUGIN REGISTRY END ===');
    }
    fetchPluginRegistry();
  }, []);

  console.log('Current plugins state:', plugins);

  return (
    <HashRouter>
      <div className="flex h-screen antialiased text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900">
        <LeftSidebar plugins={plugins} />
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
    </HashRouter>
  );
}
