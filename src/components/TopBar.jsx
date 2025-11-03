import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Settings, 
  LayoutDashboard,
  FileText,
  Hash,
  PackagePlus,
  Database,
  Zap,
  Calculator
} from 'lucide-react';

export default function LeftSidebar({ plugins }) {
  const iconMap = {
    'LayoutDashboard': LayoutDashboard,
    'FileText': FileText,
    'Hash': Hash,
    'PackagePlus': PackagePlus,
    'Settings': Settings,
    'Database': Database,
    'Zap': Zap,
    'Calculator': Calculator
  };
  
  const getIcon = (name) => {
    const IconComponent = iconMap[name];
    return IconComponent ? <IconComponent className="h-8 w-8" /> : null;
  };

  return (
    <aside className="flex-shrink-0 w-[150px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
      {/* Logo at top */}
      <div className="flex items-center justify-center h-20 border-b border-slate-200 dark:border-slate-700">
        <img src="/Craft_Logo.png" alt="Craft Logo" className="h-10 w-auto" />
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {plugins && plugins.length > 0 ? plugins.map((plugin) => (
          <NavLink
            key={plugin.id}
            to={plugin.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-4 mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`
            }
            title={plugin.title}
          >
            {getIcon(plugin.icon)}
            <span className="text-xs mt-2 text-center leading-tight">{plugin.title}</span>
          </NavLink>
        )) : (
          <div className="text-slate-400 text-xs text-center px-2">No plugins</div>
        )}
      </nav>
      
      {/* Settings at bottom */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-2">
        <button className="w-full flex flex-col items-center justify-center py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Settings className="h-6 w-6" />
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </aside>
  );
}
