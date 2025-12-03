import React, { useState, useEffect, useMemo } from 'react';
import { Layers, PlusCircle, Search } from 'lucide-react';

const Tabs = ({ children }) => <div className="w-full">{children}</div>;
const TabsList = ({ children }) => <div className="inline-flex items-center justify-center p-1 text-gray-500 bg-gray-100 rounded-lg h-9">{children}</div>;
const TabsTrigger = ({ isActive, onClick, children }) => (
  <button 
    onClick={onClick} 
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${
      isActive ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
    }`}
  >
    {children}
  </button>
);
const TabsContent = ({ isActive, children }) => <div className={isActive ? 'mt-2' : 'hidden'}>{children}</div>;

function Header({ onNewQuote }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Project Manager</h1>
        <p className="text-sm text-gray-400">Dashboard for all quotes and Pipedrive deals.</p>
      </div>
      <button onClick={onNewQuote} className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
        <svg className="w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        New Quote
      </button>
    </div>
  );
}

function PipedriveManager({ onCreateQuote }) {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const fetchedDeals = await window.pipedrive.getDeals();
      setDeals(fetchedDeals);
    } catch (err) {
      console.error("Failed to fetch Pipedrive deals:", err);
    }
    setIsLoading(false);
  };

  const handleSelectDeal = (deal) => {
    onCreateQuote({ pipedriveDeal: deal, isNew: true });
  };

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => 
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.org_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deals, searchTerm]);

  return (
    <div className="overflow-hidden bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 text-white bg-gray-700 border border-gray-600 rounded-md"
          />
          <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button onClick={fetchDeals} disabled={isLoading} className="px-4 py-2 ml-4 text-white bg-gray-700 rounded-md hover:bg-gray-600">
          {isLoading ? 'Loading...' : 'Fetch Deals'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Deal Title</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Organization</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Owner</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Stage</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Value</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">Loading Pipedrive deals...</td></tr>
            )}
            {!isLoading && filteredDeals.length === 0 && (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">
                {deals.length === 0 ? 'Click "Fetch Deals" to load data from Pipedrive.' : 'No deals found matching your search.'}
              </td></tr>
            )}
            {!isLoading && filteredDeals.map(deal => (
              <tr key={deal.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="px-3 py-3 font-medium text-white">{deal.title}</td>
                <td className="px-3 py-3 text-gray-300">{deal.org_name}</td>
                <td className="px-3 py-3 text-gray-300">{deal.owner_name}</td>
                <td className="px-3 py-3">
                  <span className="px-1 py-1 text-xs font-medium text-blue-300 bg-blue-900 rounded-full">{deal.stage}</span>
                </td>
                <td className="px-3 py-3 text-gray-300">${deal.value.toLocaleString()}</td>
                <td className="px-3 py-3">
                  <button onClick={() => handleSelectDeal(deal)} className="px-2 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Create Quote
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuoteManager({ onEditQuote }) {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const fetchedQuotes = await window.quotes.getAll();
      setQuotes(fetchedQuotes);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleEditQuote = (quote) => {
    onEditQuote({ quoteId: quote.quoteId, isNew: false });
  };
  
  const handleDeleteQuote = async (quote) => {
    if (confirm(`Are you sure you want to delete "${quote.projectName}"?`)) {
      setIsLoading(true);
      try {
        await window.quotes.delete(quote.quoteId);
        await fetchQuotes();
      } catch (err) {
        console.error("Failed to delete quote:", err);
        alert("Error: Could not delete quote.");
      }
      setIsLoading(false);
    }
  };
  
  const handleGenerateDocument = (quote) => {
    alert(`(Simulation) Generating document for: ${quote.quoteId}\n\nThis will trigger Phase 2 (BOM expansion, costing, and document generation).`);
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => 
      quote.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quotes, searchTerm]);

  return (
    <div className="overflow-hidden bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 text-white bg-gray-700 border border-gray-600 rounded-md"
          />
          <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Project Name</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Quote ID</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Customer</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Last Modified</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">Loading existing quotes...</td></tr>
            )}
            {!isLoading && filteredQuotes.length === 0 && (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">No existing quotes found.</td></tr>
            )}
            {!isLoading && filteredQuotes.map(quote => (
              <tr key={quote.quoteId} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="px-4 py-3 font-medium text-white">{quote.projectName}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{quote.quoteId}</td>
                <td className="px-4 py-3 text-gray-300">{quote.customer}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    quote.status === 'Draft' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'
                  }`}>{quote.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{new Date(quote.lastModified).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2">
                    <button onClick={() => handleGenerateDocument(quote)} className="px-3 py-1 text-sm text-white bg-gray-700 rounded-md hover:bg-gray-600">
                      Generate Doc
                    </button>
                    <button onClick={() => handleEditQuote(quote)} className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteQuote(quote)} className="p-1 text-gray-500 hover:text-red-500">
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProjectManager({ context, onNavigate }) {
  const [activeTab, setActiveTab] = useState('pipedrive');

  const handleNewQuote = () => {
    if (onNavigate) {
      onNavigate('number-generator', { isNew: true });
    }
  };

  const handleCreateQuote = (quoteContext) => {
    if (onNavigate) {
      onNavigate('number-generator', quoteContext);
    }
  };

  const handleEditQuote = (quoteContext) => {
    if (onNavigate) {
      onNavigate('number-generator', quoteContext);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <Header onNewQuote={handleNewQuote} />
      
      <Tabs>
        <TabsList>
          <TabsTrigger isActive={activeTab === 'pipedrive'} onClick={() => setActiveTab('pipedrive')}>
            <Layers className="w-4 h-4 mr-2" />
            Pipedrive Deals
          </TabsTrigger>
          <TabsTrigger isActive={activeTab === 'quotes'} onClick={() => setActiveTab('quotes')}>
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
            Existing Quotes
          </TabsTrigger>
        </TabsList>

        <TabsContent isActive={activeTab === 'pipedrive'}>
          <PipedriveManager onCreateQuote={handleCreateQuote} />
        </TabsContent>
        <TabsContent isActive={activeTab === 'quotes'}>
          <QuoteManager onEditQuote={handleEditQuote} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
