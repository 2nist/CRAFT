import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Box, FileText, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function TopTabBar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();
  const { openSearchModal } = useAppContext();
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  
  const tabs = [
    { id: 'TOOLS', label: 'TOOLS', icon: Wrench },
    { id: 'PRODUCTS', label: 'PRODUCTS', icon: Box },
    { id: 'QUOTING', label: 'QUOTING', icon: FileText }
  ];

  useEffect(() => {
    let cancelled = false;
    let timerId;

    const fetchStatus = async () => {
      if (!window.runtime?.getStatus) {
        return;
      }

      try {
        const status = await window.runtime.getStatus();
        if (!cancelled) {
          setRuntimeStatus(status);
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeStatus({
            ok: false,
            usingOverride: Boolean(window.runtime),
            message: `Runtime status unavailable: ${error.message}`
          });
        }
      }
    };

    fetchStatus();
    timerId = setInterval(fetchStatus, 30000);

    return () => {
      cancelled = true;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, []);

  const indicator = (() => {
    if (!runtimeStatus) {
      return {
        color: 'bg-slate-500',
        label: window.runtime ? 'Runtime' : 'N/A',
        title: window.runtime ? 'Runtime status pending...' : 'Runtime bridge unavailable'
      };
    }

    if (!runtimeStatus.usingOverride) {
      return {
        color: 'bg-blue-500',
        label: 'Local',
        title: runtimeStatus.message || 'Using local runtime assets'
      };
    }

    if (runtimeStatus.error && typeof runtimeStatus.ok !== 'boolean') {
      return {
        color: 'bg-yellow-500',
        label: 'NAS',
        title: runtimeStatus.message || 'Runtime status pending...'
      };
    }

    return {
      color: runtimeStatus.ok ? 'bg-green-500' : 'bg-red-500',
      label: 'NAS',
      title: runtimeStatus.message || (runtimeStatus.ok ? 'NAS runtime available' : 'NAS runtime unavailable')
    };
  })();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center h-16 px-6">
        {/* Logo - Clickable to go home */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center mr-8 hover:opacity-80 transition-opacity"
          title="Go to Home"
        >
          <img src="/Craft_Logo.png" alt="Craft Logo" className="h-10 w-auto" />
        </button>

        {/* Tab Navigation */}
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 font-medium text-sm transition-colors relative ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Button */}
        <button
          onClick={openSearchModal}
          className="flex items-center gap-2 px-4 py-2 mr-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          title="Search Components (Ctrl+K)"
        >
          <Search size={16} />
          Search
        </button>

        {/* Optional: User/Settings area */}
        <div className="flex items-center space-x-4">
          <div
            className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
            title={indicator.title}
          >
            <span className={`inline-flex h-3 w-3 rounded-full ${indicator.color}`} aria-hidden="true" />
            <span className="hidden sm:inline">{indicator.label}</span>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Craft Tools Hub
          </span>
        </div>
      </div>
    </header>
  );
}
