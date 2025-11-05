import React, { useState, useEffect } from 'react';
import { icons } from 'lucide-react';

export default function HubDashboard({ context }) {
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [usefulLinks, setUsefulLinks] = useState([]);
  const [docHubItems, setDocHubItems] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [quotes, links, docs, dashSettings] = await Promise.all([
          window.quotes.getAll(),
          window.api.getUsefulLinks(),
          window.api.getDocHubItems(),
          window.api.getDashboardSettings()
        ]);
        setRecentQuotes(quotes.slice(-5).reverse());
        setUsefulLinks(links);
        setDocHubItems(docs);
        setSettings(dashSettings);
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

  return (
    <div className="container mx-auto max-w-7xl">
      {settings.layout.showWelcomeMessage && settings.welcomeMessage.enabled && (
        <div className="mb-8 p-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-700/50">
          {settings.welcomeMessage.showLogo && (
            <div className="mb-4">
              <img src="/Craft_Logo.png" alt="Craft Automation" className="h-16" />
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
    </div>
  );
}

const Widget = ({ title, children }) => (
  <section className="bg-white dark:bg-slate-800/50 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700">
    <h2 className="text-lg font-semibold px-5 py-4 border-b border-slate-200 dark:border-slate-700">
      {title}
    </h2>
    <div>{children}</div>
  </section>
);

const DynamicIcon = ({ name, ...props }) => {
  const IconComponent = icons[name];
  if (!IconComponent) return <icons.HelpCircle {...props} />;
  return <IconComponent {...props} />;
};
