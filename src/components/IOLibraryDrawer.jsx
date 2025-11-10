import React, { useState } from 'react';
import { Settings, X, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// P&ID ICON COMPONENTS
// ============================================================================

export const PIDIcons = {
  DigitalInput: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="8" width="16" height="8" rx="1" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  AnalogInput: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
      <path d="M15 9l-6 6M9 9l6 6" strokeWidth="1" />
    </svg>
  ),
  DigitalOutput: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="8" width="16" height="8" rx="1" />
      <path d="M12 12h6M15 9l3 3-3 3" />
    </svg>
  ),
  AnalogOutput: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12h5M14 10l3 2-3 2" />
      <path d="M8 10v4l2-2-2-2" />
    </svg>
  ),
  Motor: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="6" />
      <text x="12" y="16" fontSize="10" fill="currentColor" textAnchor="middle">M</text>
    </svg>
  ),
  Valve: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />
    </svg>
  ),
  Sensor: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Heater: ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h16M6 8l2 4-2 4M10 8l2 4-2 4M14 8l2 4-2 4M18 8l2 4-2 4" />
    </svg>
  )
};

// ============================================================================
// I/O LIBRARY DRAWER COMPONENT
// ============================================================================

export const IOLibraryDrawer = ({ isOpen, onClose, onAddToAssembly, defaultIOFields }) => {
  const [activeTab, setActiveTab] = useState('digitalIn');
  const [draggedItem, setDraggedItem] = useState(null);

  const ioCategories = [
    { key: 'digitalIn', label: 'Digital In', icon: PIDIcons.DigitalInput, color: 'blue' },
    { key: 'analogIn', label: 'Analog In', icon: PIDIcons.AnalogInput, color: 'emerald' },
    { key: 'digitalOut', label: 'Digital Out', icon: PIDIcons.DigitalOutput, color: 'amber' },
    { key: 'analogOut', label: 'Analog Out', icon: PIDIcons.AnalogOutput, color: 'purple' }
  ];

  const commonComponents = [
    { type: 'Motor', icon: PIDIcons.Motor, fields: ['digitalOut', 'analogIn'], description: 'VFD Motor Control' },
    { type: 'Valve', icon: PIDIcons.Valve, fields: ['digitalOut', 'digitalIn'], description: 'Solenoid Valve w/ Feedback' },
    { type: 'Sensor', icon: PIDIcons.Sensor, fields: ['analogIn', 'digitalIn'], description: 'Analog Sensor w/ Alarm' },
    { type: 'Heater', icon: PIDIcons.Heater, fields: ['digitalOut', 'analogOut'], description: 'Electric Heater w/ Control' }
  ];

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const activeCategory = ioCategories.find(cat => cat.key === activeTab);
  const currentFields = defaultIOFields[activeTab] || [];

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">I/O Library</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 transition-colors rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 gap-1 p-2 border-b border-slate-800">
        {ioCategories.map(category => {
          const Icon = category.icon;
          const isActive = activeTab === category.key;
          return (
            <button
              key={category.key}
              onClick={() => setActiveTab(category.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all",
                isActive
                  ? "bg-blue-500/20 border border-blue-500/40 text-blue-200"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* I/O Point Library */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <div className="mb-3">
          <p className="px-2 mb-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
            Individual Points
          </p>
          {currentFields.length === 0 ? (
            <div className="p-4 text-xs text-center border border-dashed rounded-lg text-slate-500 border-slate-700">
              No {activeCategory?.label} defined
            </div>
          ) : (
            currentFields.map((field, idx) => {
              const Icon = activeCategory.icon;
              return (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, { ...field, category: activeTab })}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 mb-1 rounded-lg cursor-move transition-all group",
                    "bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600",
                    draggedItem === field && "opacity-50"
                  )}
                >
                  <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                  <Icon className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-slate-200">{field.fieldName}</p>
                    {field.description && (
                      <p className="text-xs truncate text-slate-500">{field.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onAddToAssembly({ ...field, category: activeTab })}
                    className="p-1 transition-colors rounded text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Common Component Templates */}
        <div>
          <p className="px-2 mb-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
            Component Templates
          </p>
          {commonComponents.map((component, idx) => {
            const Icon = component.icon;
            return (
              <div
                key={idx}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 mb-1 rounded-lg cursor-move transition-all group",
                  "bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600"
                )}
              >
                <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                <Icon className="w-5 h-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-200">{component.type}</p>
                  <p className="text-xs text-slate-500">{component.description}</p>
                </div>
                <button
                  onClick={() => onAddToAssembly(component)}
                  className="p-1 transition-colors rounded text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Tip */}
      <div className="p-3 m-3 border rounded-lg bg-slate-900/50 border-slate-800">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-blue-400">💡 Tip:</span> Drag items to assemblies or click <Plus className="inline w-3 h-3" /> to add
        </p>
      </div>
    </div>
  );
};
