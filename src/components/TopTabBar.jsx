import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Box, FileText, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SyncStatus from './SyncStatus';

export default function TopTabBar({ activeTab, setActiveTab }) {
  const navigate = useNavigate();
  const { openSearchModal } = useAppContext();
  const [logoUrl, setLogoUrl] = useState('/Craft_Logo.png');
  
  const tabs = [
    { id: 'TOOLS', label: 'TOOLS', icon: Wrench },
    { id: 'PRODUCTS', label: 'PRODUCTS', icon: Box },
    { id: 'QUOTING', label: 'QUOTING', icon: FileText }
  ];

  useEffect(() => {
    let cancelled = false;

    const loadLogo = async () => {
      try {
        const logo = await window.api.getLogoUrl();
        if (!cancelled) {
          setLogoUrl(logo);
        }
      } catch (error) {
        console.error('Failed to load logo URL:', error);
      }
    };

    loadLogo();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="flex items-center h-16 px-6">
        {/* Logo - Clickable to go home */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center mr-8 hover:opacity-80 transition-opacity"
          title="Go to Home"
        >
          <img src={logoUrl} alt="Craft Logo" className="h-10 w-auto" />
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
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
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
          className="flex items-center justify-center w-10 h-10 mr-4 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Search Components (Ctrl+K)"
        >
          <Search size={20} />
        </button>

        {/* Sync Status */}
        <SyncStatus />

        {/* App Title */}
        <div className="flex items-center ml-4">
          <span className="text-sm text-muted-foreground">
            Craft Automation CPQ
          </span>
        </div>
      </div>
    </header>
  );
}
