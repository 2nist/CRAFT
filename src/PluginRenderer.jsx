import React, { useEffect, useRef } from 'react';
import pluginCss from './plugin.css?raw';

/**
 * PluginRenderer component
 * Renders plugin HTML content in an isolated iframe with sandbox restrictions
 */
const PluginRenderer = ({ pluginId, htmlContent }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Expose Electron APIs to the plugin iframe context FIRST
      try {
        const win = iframe.contentWindow;
        if (win) {
          if (window.components) win.components = window.components;
          if (window.assemblies) win.assemblies = window.assemblies;
          if (window.panels) win.panels = window.panels;
          if (window.schemas) win.schemas = window.schemas;
          if (window.customers) win.customers = window.customers;
          if (window.quotes) win.quotes = window.quotes;
          if (window.db) win.db = window.db;
          if (window.electronAPI) win.electronAPI = window.electronAPI;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to expose APIs to plugin iframe:', e);
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Inject global theme override CSS FIRST (before any plugin styles)
      const head = iframeDoc.head || iframeDoc.getElementsByTagName('head')[0];
      if (head) {
        try {
          // Create a style element with high priority CSS reset
          const resetStyle = iframeDoc.createElement('style');
          resetStyle.type = 'text/css';
          resetStyle.setAttribute('data-plugin-reset', 'true');
          resetStyle.textContent = `
            /* Global Theme Override - Highest Priority */
            * {
              box-sizing: border-box !important;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Poppins', 'Inter', sans-serif !important;
              background-color: #F5E5D0 !important;
              color: #4A5A63 !important;
              font-size: 14px !important;
              line-height: 1.5 !important;
            }

            /* Override all background colors */
            body, div, span, p, section, article, header, footer, main, aside, nav,
            form, fieldset, legend, label, input, button, select, textarea, optgroup, option,
            table, caption, tbody, tfoot, thead, tr, th, td {
              background-color: #F5E5D0 !important;
              color: #4A5A63 !important;
            }

            /* Override specific dark colors used in plugins */
            [style*="background-color:#1a1614"],
            [style*="background-color:#2d2925"],
            [style*="background-color:#3d3935"],
            [style*="background-color:#4d4945"],
            [style*="background-color:#5d5955"] {
              background-color: #F5E5D0 !important;
            }

            [style*="color:#f5f0ea"],
            [style*="color:#ff6f29"],
            [style*="color:#ff8547"] {
              color: #4A5A63 !important;
            }

            /* Override Tailwind classes that plugins might use */
            .bg-gray-800, .bg-gray-900, .bg-black, .bg-slate-900, .bg-slate-800,
            .bg-slate-700, .bg-slate-600 {
              background-color: white !important;
            }

            .text-white, .text-gray-300, .text-gray-400, .text-gray-500,
            .text-slate-300, .text-slate-400, .text-slate-500 {
              color: #4A5A63 !important;
            }

            .border-gray-300, .border-gray-600, .border-gray-700 {
              border-color: #d1d5db !important;
            }

            /* Override form elements specifically */
            input, select, textarea, button {
              background-color: white !important;
              color: #4A5A63 !important;
              border: 1px solid #d1d5db !important;
            }

            input:focus, select:focus, textarea:focus {
              border-color: #D67F5C !important;
              outline: none !important;
            }

            button {
              background-color: #D67F5C !important;
              color: white !important;
              border: none !important;
            }

            button:hover {
              background-color: #c66d4d !important;
            }

            /* Override table styling */
            table {
              background-color: white !important;
              color: #4A5A63 !important;
            }

            th, td {
              background-color: transparent !important;
              color: inherit !important;
            }

            /* Override modal backgrounds */
            .fixed, .absolute, .relative {
              background-color: transparent !important;
            }

            /* Force all text to be readable */
            h1, h2, h3, h4, h5, h6, p, span, div, label, li, td, th {
              color: #4A5A63 !important;
            }

            /* Override any hardcoded accent colors to use theme accent */
            [style*="color:#ff6f29"], [style*="color:#ff8547"] {
              color: #D67F5C !important;
            }

            [style*="background-color:#ff6f29"], [style*="background-color:#ff8547"] {
              background-color: #D67F5C !important;
            }

            /* Override any green/red accent colors to maintain readability */
            .text-green-400, .text-green-600, .text-red-400, .text-red-600,
            .text-blue-400, .text-blue-600 {
              color: inherit !important;
            }
          `;
          head.insertBefore(resetStyle, head.firstChild);

          const preconnect1 = iframeDoc.createElement('link');
          preconnect1.rel = 'preconnect';
          preconnect1.href = 'https://fonts.googleapis.com';
          head.appendChild(preconnect1);

          const preconnect2 = iframeDoc.createElement('link');
          preconnect2.rel = 'preconnect';
          preconnect2.href = 'https://fonts.gstatic.com';
          preconnect2.crossOrigin = 'anonymous';
          head.appendChild(preconnect2);

          const fontsLink = iframeDoc.createElement('link');
          fontsLink.rel = 'stylesheet';
          fontsLink.href = 'https://fonts.googleapis.com/css2?family=Bungee&family=Poppins:wght@400;500;600;700&display=swap';
          head.appendChild(fontsLink);

          const styleEl = iframeDoc.createElement('style');
          styleEl.type = 'text/css';
          styleEl.appendChild(iframeDoc.createTextNode(pluginCss));
          head.appendChild(styleEl);
        } catch (e) {
          // Non-fatal if fonts/styles fail to inject
          // eslint-disable-next-line no-console
          console.warn('Plugin style injection failed:', e);
        }
      }
    }
  }, [htmlContent]);

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        title={pluginId}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          minHeight: '600px'
        }}
      />
    </div>
  );
};

export default PluginRenderer;
