import React, { useState, useEffect } from 'react';
import { icons } from 'lucide-react';

export default function HubDashboard({ context }) {
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [usefulLinks, setUsefulLinks] = useState([]);
  const [docHubItems, setDocHubItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [toolboxItems, setToolboxItems] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [isEditingToolbox, setIsEditingToolbox] = useState(false);
  const [draftTools, setDraftTools] = useState([]);
  const [logoUrl, setLogoUrl] = useState('/Craft_Logo.png');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [quotes, links, docs, dashSettings, logo] = await Promise.all([
          window.quotes.getAll(),
          window.api.getUsefulLinks(),
          window.api.getDocHubItems(),
          window.api.getDashboardSettings(),
          window.api.getLogoUrl()
        ]);
        setRecentQuotes(quotes.slice(-5).reverse());
        setUsefulLinks(links);
        setDocHubItems(docs);
        setSettings(dashSettings);
        setLogoUrl(logo);
        // Try to load toolbox items from API if available, otherwise use defaults
        try {
          const apiItems = await (window.api.getToolboxItems?.());
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            setToolboxItems(apiItems);
            setActiveTool(apiItems[0]);
          } else {
            // Try reading toolbox manifest via IPC
            try {
              const manifest = await window.api.getToolboxManifest();
              if (Array.isArray(manifest) && manifest.length > 0) {
                setToolboxItems(manifest);
                setActiveTool(manifest[0]);
              } else {
                const defaults = [
                  { title: "Ohm's Law Helper", path: "/toolbox/sample-calculator.html", icon: "Calculator" }
                ];
                setToolboxItems(defaults);
                setActiveTool(defaults[0]);
              }
            } catch {
              const defaults = [
                { title: "Ohm's Law Helper", path: "/toolbox/sample-calculator.html", icon: "Calculator" }
              ];
              setToolboxItems(defaults);
              setActiveTool(defaults[0]);
            }
          }
        } catch {
          // API not available - try manifest via IPC
          try {
            const manifest = await window.api.getToolboxManifest();
            if (Array.isArray(manifest) && manifest.length > 0) {
              setToolboxItems(manifest);
              setActiveTool(manifest[0]);
            } else {
              const defaults = [
                { title: "Ohm's Law Helper", path: "/toolbox/sample-calculator.html", icon: "Calculator" }
              ];
              setToolboxItems(defaults);
              setActiveTool(defaults[0]);
            }
          } catch {
            const defaults = [
              { title: "Ohm's Law Helper", path: "/toolbox/sample-calculator.html", icon: "Calculator" }
            ];
            setToolboxItems(defaults);
            setActiveTool(defaults[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    }
    loadDashboard();
  }, []);

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Feature flags with safe defaults
  const showToolbox = settings?.layout?.showToolbox !== false; // default true unless explicitly false

  return (
    <div className="container mx-auto max-w-7xl">
      {settings.layout.showWelcomeMessage && settings.welcomeMessage.enabled && (
        <div className="mb-8 p-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-700/50 backdrop-blur-sm">
          {settings.welcomeMessage.showLogo && (
            <div className="mb-4">
              <img src={logoUrl} alt="Craft Automation" className="h-16" />
            </div>
          )}
          <h1 className="text-4xl font-bold text-white mb-2">
            {settings.welcomeMessage.title}
          </h1>
          <p className="text-lg text-gray-300">
            {settings.welcomeMessage.subtitle}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {showToolbox && (
            <Widget 
              title="Toolbox"
              actions={
                <button
                  onClick={() => { setDraftTools(toolboxItems); setIsEditingToolbox(true); }}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-700 bg-slate-800/60 hover:bg-slate-800"
                >
                  Edit Toolbox
                </button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <div className="space-y-2 md:col-span-1">
                  {toolboxItems.map((tool) => (
                    <button
                      key={tool.title}
                      onClick={() => setActiveTool(tool)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        activeTool?.title === tool.title
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-100'
                          : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <DynamicIcon name={tool.icon || 'Wrench'} className="h-4 w-4 opacity-80" />
                        <span className="font-medium">{tool.title}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="md:col-span-2">
                  {activeTool ? (
                    <ToolIframe tool={activeTool} />
                  ) : (
                    <div className="p-6 text-sm text-slate-400">Select a tool to preview.</div>
                  )}
                </div>
              </div>
            </Widget>
          )}
          {settings.layout.showRecentQuotes && (
            <Widget title="Recent Quotes">
              {recentQuotes.length > 0 ? (
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {recentQuotes.map((quote) => (
                    <li key={quote.quoteId} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                      <div>
                        <div className="font-semibold text-blue-600 dark:text-blue-400">{quote.projectName || 'Untitled Project'}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{quote.quoteId}</div>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{quote.customer || 'No Customer'}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 p-3">No recent quotes found.</p>
              )}
            </Widget>
          )}

          {settings.layout.showDocumentHub && (
            <Widget title="Document Hub">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                {docHubItems.map((item) => (
                  <a 
                    key={item.title} 
                    href={item.path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <DynamicIcon name={item.icon} className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <span className="text-sm font-medium text-center">{item.title}</span>
                  </a>
                ))}
              </div>
            </Widget>
          )}
        </div>

        {settings.layout.showUsefulLinks && (
          <div className="lg:col-span-1 space-y-6">
            <Widget title="Useful Links">
              <div className="flex flex-col space-y-2 p-3">
                {usefulLinks.map((link) => (
                  <a 
                    key={link.title} 
                    href={link.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <DynamicIcon name={link.icon} className="h-5 w-5 text-slate-600 dark:text-slate-300 mr-3" />
                    <span className="font-medium">{link.title}</span>
                  </a>
                ))}
              </div>
            </Widget>
          </div>
        )}
      </div>

      {isEditingToolbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-3xl max-h-full overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold">Edit Toolbox</h3>
              <button onClick={() => setIsEditingToolbox(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {draftTools.length === 0 && (
                <div className="text-sm text-slate-400">No tools added yet.</div>
              )}

              {draftTools.map((tool, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4">
                      <label className="text-xs text-slate-400">Title</label>
                      <input 
                        type="text" 
                        value={tool.title || ''}
                        onChange={e => {
                          const v = e.target.value;
                          setDraftTools(prev => prev.map((t,i) => i===idx ? { ...t, title: v } : t));
                        }}
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-700 bg-slate-950"
                      />
                    </div>
                    <div className="md:col-span-6">
                      <label className="text-xs text-slate-400">Path</label>
                      <input 
                        type="text" 
                        value={tool.path || ''}
                        onChange={e => {
                          const v = e.target.value;
                          setDraftTools(prev => prev.map((t,i) => i===idx ? { ...t, path: v } : t));
                        }}
                        placeholder="/toolbox/your-file.html"
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-700 bg-slate-950 font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-400">Icon</label>
                      <input 
                        type="text" 
                        value={tool.icon || ''}
                        onChange={e => {
                          const v = e.target.value;
                          setDraftTools(prev => prev.map((t,i) => i===idx ? { ...t, icon: v } : t));
                        }}
                        placeholder="Wrench"
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-700 bg-slate-950"
                      />
                    </div>
                    <div className="md:col-span-12 flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded-md border border-slate-700 bg-slate-800"
                        onClick={() => setDraftTools(prev => idx>0 ? (()=>{ const c=[...prev]; [c[idx-1],c[idx]]=[c[idx],c[idx-1]]; return c; })() : prev)}
                        title="Move up"
                      >↑</button>
                      <button
                        className="px-2 py-1 text-xs rounded-md border border-slate-700 bg-slate-800"
                        onClick={() => setDraftTools(prev => idx<prev.length-1 ? (()=>{ const c=[...prev]; [c[idx+1],c[idx]]=[c[idx],c[idx+1]]; return c; })() : prev)}
                        title="Move down"
                      >↓</button>
                      <button
                        className="px-2 py-1 text-xs rounded-md border border-red-700 bg-red-900/40 text-red-200"
                        onClick={() => setDraftTools(prev => prev.filter((_,i)=>i!==idx))}
                      >Remove</button>
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <button
                  className="px-3 py-2 text-sm rounded-md border border-slate-700 bg-slate-800"
                  onClick={() => setDraftTools(prev => [...prev, { title: 'New Tool', path: '/toolbox/your-file.html', icon: 'Wrench' }])}
                >
                  + Add Tool
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
              <button
                onClick={() => setIsEditingToolbox(false)}
                className="px-4 py-2 text-sm rounded-md border border-slate-700 bg-slate-800"
              >Cancel</button>
              <button
                onClick={async () => {
                  try {
                    if (window.api?.saveToolboxItems) {
                      await window.api.saveToolboxItems(draftTools);
                    } else {
                      console.warn('saveToolboxItems API not available; persisting to manifest is not supported in this build.');
                    }
                  } catch (e) {
                    console.error('Failed to save toolbox items:', e);
                  } finally {
                    setToolboxItems(draftTools);
                    setActiveTool(draftTools[0] || null);
                    setIsEditingToolbox(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium rounded-md border border-blue-600 bg-blue-600/20 text-blue-100 hover:bg-blue-600/30"
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Widget = ({ title, children, actions = null }) => (
  <section className="bg-white dark:bg-slate-800/50 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-semibold">{title}</h2>
      {actions}
    </div>
    <div>{children}</div>
  </section>
);

const DynamicIcon = ({ name, ...props }) => {
  const IconComponent = icons[name];
  if (!IconComponent) return <icons.HelpCircle {...props} />;
  return <IconComponent {...props} />;
};

const ToolIframe = ({ tool }) => {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIframeSrc = async () => {
      try {
        setLoading(true);
        const url = await window.api.getToolFileUrl(tool.path);
        setIframeSrc(url);
      } catch (error) {
        console.error('Failed to get tool file URL:', error);
        setIframeSrc(tool.path); // fallback to original path
      } finally {
        setLoading(false);
      }
    };

    loadIframeSrc();
  }, [tool.path]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/60 flex items-center justify-center" style={{ height: 420 }}>
        <div className="text-sm text-slate-400">Loading tool...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/60">
      <iframe
        key={tool.path}
        src={iframeSrc}
        title={tool.title}
        style={{ width: '100%', height: 420, border: '0' }}
        sandbox="allow-scripts allow-forms allow-same-origin"
      />
    </div>
  );
};
