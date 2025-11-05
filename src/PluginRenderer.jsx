import React, { Suspense, lazy } from 'react';

// Map plugin IDs to their new component paths
const pluginMap = {
  'hub-dashboard': lazy(() => import('./plugins/HubDashboard.jsx')),
  'project-manager': lazy(() => import('./plugins/ProjectManager.jsx')),
  'quote-configurator': lazy(() => import('./plugins/QuoteConfigurator.jsx')),
  'assembly-manager': lazy(() => import('./plugins/AssemblyManager.jsx')),
  'product-template-manager': lazy(() => import('./plugins/ProductTemplateManager.jsx')),
  'component-manager': lazy(() => import('./plugins/ComponentManager.jsx')),
  'number-generator': lazy(() => import('./plugins/NumberGenerator.jsx')),
  'fla-calc': lazy(() => import('./plugins/FlaCalculator.jsx')),
  'margin-calc': lazy(() => import('./plugins/MarginCalculator.jsx')),
  'bom-importer': lazy(() => import('./plugins/LegacyBomImporter.jsx')),
  'manual-bom-builder': lazy(() => import('./plugins/ManualBomBuilder.jsx')),
  'settings': lazy(() => import('./Settings.jsx')),
};

/**
 * PluginRenderer component
 * Renders plugin components directly using React.lazy and Suspense
 * Plugins now share the same React, Tailwind, and shadcn context as the main app
 */
const PluginRenderer = ({ pluginId, pluginContext, onNavigate }) => {
  const PluginComponent = pluginMap[pluginId];
  
  if (!PluginComponent) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-900 text-red-200 p-4 rounded-lg">
          <p className="font-semibold">Error: Plugin '{pluginId}' not found.</p>
          <p className="text-sm mt-2">Available plugins: {Object.keys(pluginMap).join(', ')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading plugin...</p>
          </div>
        </div>
      }>
        <PluginComponent context={pluginContext} onNavigate={onNavigate} />
      </Suspense>
    </div>
  );
};

export default PluginRenderer;
