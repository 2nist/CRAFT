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
      
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Inject shared fonts and plugin css
      const head = iframeDoc.head || iframeDoc.getElementsByTagName('head')[0];
      if (head) {
        try {
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
        sandbox="allow-scripts allow-same-origin allow-forms"
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
