import React, { useState, useEffect } from 'react';
import { icons } from 'lucide-react';

export default function HubDashboard({ context }) {
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [usefulLinks, setUsefulLinks] = useState([]);
  const [docHubItems, setDocHubItems] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const quotes = await window.quotes.getAll();
        setRecentQuotes(quotes.slice(-5).reverse());
        const links = await window.api.getUsefulLinks();
        setUsefulLinks(links);
        const docs = await window.api.getDocHubItems();
        setDocHubItems(docs);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="container mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
        Welcome to the Craft Tools Hub
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
        </div>
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
