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
  Calculator,
  ClipboardList,
  History
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
    'Calculator': Calculator,
    'ClipboardList': ClipboardList,
    'History': History
  };

  const getIcon = (name) => {
    const IconComponent = iconMap[name];
    return IconComponent ? <IconComponent className="h-8 w-8" /> : null;
  };

  return (
    <aside className="flex-shrink-0 w-[150px] bg-card border-r border-border shadow-sm flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">{plugins && plugins.length > 0 ? plugins.map((plugin) => (
          <NavLink
            key={plugin.id}
            to={plugin.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-2 py-4 mb-2 transition-colors ${isActive
                ? 'bg-accent/10 text-primary border-l-4 border-primary'
                : 'text-muted-foreground hover:bg-muted/50'
              }`
            }
            title={plugin.title}
          >
            {getIcon(plugin.icon)}
            <span className="text-xs mt-2 text-center leading-tight">{plugin.title}</span>
          </NavLink>
        )) : (
          <div className="text-muted-foreground text-xs text-center px-2">No plugins</div>
        )}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-border p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-full flex flex-col items-center justify-center py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-accent/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`
          }
        >
          <Settings className="h-6 w-6" />
          <span className="text-xs mt-1">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
