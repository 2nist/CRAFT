import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, GripVertical, Plus, Save, Upload, X, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AssemblyIOBuilder from '@/components/AssemblyIOBuilder';

// ============================================================================
// CONSTANTS & UTILITY FUNCTIONS
// ============================================================================

const DESKTOP_BREAKPOINT = '(min-width: 1280px)';
const LEFT_DRAWER_WIDTH = 360;
const RIGHT_DRAWER_WIDTH = 352;
const HANDLE_WIDTH = 28;

const normalizeSchemaOptions = (options = []) =>
  options.map(option => {
    const code = option.code ?? option.const;
    return code !== undefined ? { ...option, code } : option;
  });

const generateUniqueId = (prefix = 'field') => 
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const cloneIoFieldDefinition = (field = {}, source = 'template') => {
  const clone = JSON.parse(JSON.stringify(field));
  const baseName = clone.fieldName || 'Field';
  const safeBase = baseName.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase() || 'field';

  clone.source = source;
  clone.fieldId = clone.fieldId || `${safeBase}_${source}`;
  if (!clone.valueKey) {
    clone.valueKey = source === 'template' || source === 'catalog'
      ? baseName
      : generateUniqueId(safeBase);
  }

  return clone;
};

const ensureIoSelections = (instance = {}, assembly, defaultCatalog = {}) => {
  const selections = instance.ioSelections || {};
  const assemblyFields = assembly?.fields || {};
  const sections = ['digitalIn', 'analogIn', 'digitalOut', 'analogOut'];

  const createSection = (sectionKey) => {
    const merged = new Map();

    const addFields = (fields = [], source = 'instance') => {
      fields.forEach(field => {
        if (!field) return;
        const clone = cloneIoFieldDefinition(field, field.source || source);
        const key = (clone.fieldName || clone.valueKey || generateUniqueId(sectionKey)).trim().toLowerCase();
        if (!merged.has(key)) {
          merged.set(key, clone);
        }
      });
    };

    addFields(assemblyFields[sectionKey], 'template');
    addFields(selections[sectionKey], 'instance');
    addFields(defaultCatalog[sectionKey], 'catalog');

    return Array.from(merged.values());
  };

  return sections.reduce((acc, key) => {
    acc[key] = createSection(key);
    return acc;
  }, {});
};

const getFieldEffectiveValue = (field = {}, instanceFields = {}) => {
  const keys = [];
  if (field.fieldName) keys.push(field.fieldName);
  if (field.valueKey) keys.push(field.valueKey);

  for (const key of keys) {
    if (key && Object.prototype.hasOwnProperty.call(instanceFields, key)) {
      return instanceFields[key];
    }
  }

  if (field.value !== undefined) return field.value;
  if (field.defaultValue !== undefined) return field.defaultValue;
  return null;
};

const countActiveIoPoints = (fields = [], instanceFields = {}) => {
  return fields.reduce((sum, field) => {
    if (!field) return sum;
    const value = getFieldEffectiveValue(field, instanceFields);
    const type = (field.fieldType || '').toLowerCase();

    switch (type) {
      case 'boolean':
        return sum + ((value === true || value === 'true') ? 1 : 0);
      case 'number': {
        const numeric = Number(value ?? 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return sum;
        return sum + Math.floor(numeric);
      }
      case 'list':
        return sum + (value ? 1 : 0);
      default:
        return sum + (value ? 1 : 0);
    }
  }, 0);
};

// ============================================================================
// P&ID ICON COMPONENTS
// ============================================================================

const PIDIcons = {
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

const IOLibraryDrawer = ({ isOpen, onClose, onAddToAssembly, defaultIOFields }) => {
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

// ============================================================================
// PRODUCT CONFIGURATION FORM
// ============================================================================

function ProductConfigurationForm({ 
  currentTemplate, 
  productConfiguration, 
  setProductConfiguration, 
  defaultIOFields,
  onAddIOField 
}) {
  const templateAssemblies = useMemo(
    () => (Array.isArray(currentTemplate?.assemblies) ? currentTemplate.assemblies : []),
    [currentTemplate?.assemblies]
  );

  const customAssemblies = useMemo(() => {
    const list = productConfiguration?.__customAssemblies;
    return Array.isArray(list) ? list : [];
  }, [productConfiguration?.__customAssemblies]);

  const assembliesToRender = useMemo(() => {
    return [...templateAssemblies, ...customAssemblies];
  }, [templateAssemblies, customAssemblies]);

  const [activeInstanceModal, setActiveInstanceModal] = useState(null);
  const [dropTargetInstance, setDropTargetInstance] = useState(null);

  // Handle drag over to show drop zone
  const handleDragOver = useCallback((e, assemblyId, instanceId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetInstance({ assemblyId, instanceId });
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDropTargetInstance(null);
  }, []);

  // Handle drop of I/O field
  const handleDrop = useCallback((e, assemblyId, instanceId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetInstance(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      setProductConfiguration(prev => {
        const instances = Array.isArray(prev[assemblyId]) ? prev[assemblyId] : [];
        const instanceIndex = instances.findIndex(inst => inst.instanceId === instanceId);
        
        if (instanceIndex === -1) return prev;

        const updatedInstances = [...instances];
        const instance = updatedInstances[instanceIndex];
        const ioSelections = instance.ioSelections || { digitalIn: [], analogIn: [], digitalOut: [], analogOut: [] };
        
        // Add the new field to the appropriate category
        const category = data.category || 'digitalIn';
        const newField = cloneIoFieldDefinition(data, 'custom');
        
        updatedInstances[instanceIndex] = {
          ...instance,
          ioSelections: {
            ...ioSelections,
            [category]: [...(ioSelections[category] || []), newField]
          }
        };

        return {
          ...prev,
          [assemblyId]: updatedInstances
        };
      });

      console.log('Added I/O field:', data, 'to', assemblyId, instanceId);
    } catch (error) {
      console.error('Failed to parse dropped data:', error);
    }
  }, [setProductConfiguration]);

  // Initialize assembly instances
  useEffect(() => {
    if (assembliesToRender.length === 0) return;

    setProductConfiguration(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      assembliesToRender.forEach(assembly => {
        if (!assembly?.assemblyId) return;

        const assemblyId = assembly.assemblyId;
        const requiredSubAssemblies = assembly.subAssemblies?.required || [];
        const currentInstances = Array.isArray(updated[assemblyId]) ? updated[assemblyId] : [];

        if (currentInstances.length === 0) {
          updated[assemblyId] = [{
            instanceId: `${assemblyId}_1`,
            instanceLabel: `${assembly.displayName || assemblyId} 1`,
            fields: {},
            selectedSubAssemblies: [...requiredSubAssemblies],
            ioSelections: ensureIoSelections({}, assembly, defaultIOFields)
          }];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [assembliesToRender, defaultIOFields, setProductConfiguration]);

  const handleRemoveIOField = useCallback((assemblyId, instanceId, category, fieldIndex) => {
    setProductConfiguration(prev => {
      const instances = Array.isArray(prev[assemblyId]) ? prev[assemblyId] : [];
      const instanceIndex = instances.findIndex(inst => inst.instanceId === instanceId);
      
      if (instanceIndex === -1) return prev;

      const updatedInstances = [...instances];
      const instance = updatedInstances[instanceIndex];
      const ioSelections = instance.ioSelections || {};
      const categoryFields = ioSelections[category] || [];

      updatedInstances[instanceIndex] = {
        ...instance,
        ioSelections: {
          ...ioSelections,
          [category]: categoryFields.filter((_, idx) => idx !== fieldIndex)
        }
      };

      return {
        ...prev,
        [assemblyId]: updatedInstances
      };
    });
  }, [setProductConfiguration]);

  if (!currentTemplate) {
    return (
      <div className="p-8 text-center border border-dashed rounded-lg border-slate-700">
        <p className="text-slate-400">Select a product to begin configuration</p>
      </div>
    );
  }

  const ioSectionKeys = ['digitalIn', 'analogIn', 'digitalOut', 'analogOut'];
  const sectionTitles = {
    digitalIn: 'Digital Inputs',
    analogIn: 'Analog Inputs',
    digitalOut: 'Digital Outputs',
    analogOut: 'Analog Outputs'
  };

  const sectionIcons = {
    digitalIn: PIDIcons.DigitalInput,
    analogIn: PIDIcons.AnalogInput,
    digitalOut: PIDIcons.DigitalOutput,
    analogOut: PIDIcons.AnalogOutput
  };

  return (
    <div className="space-y-4">
      {assembliesToRender.map(assembly => {
        const assemblyId = assembly.assemblyId;
        const instances = Array.isArray(productConfiguration[assemblyId]) ? productConfiguration[assemblyId] : [];

        return (
          <div key={assemblyId} className="border rounded-lg border-slate-800 bg-slate-900/60">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-white">{assembly.displayName || assemblyId}</h3>
              {assembly.description && (
                <p className="text-xs text-slate-400">{assembly.description}</p>
              )}
            </div>

            <div className="p-4 space-y-3">
              {instances.map((instance, idx) => {
                const instanceId = instance.instanceId;
                const ioSelections = instance.ioSelections || {};
                const isDropTarget = dropTargetInstance?.assemblyId === assemblyId && dropTargetInstance?.instanceId === instanceId;

                return (
                  <div
                    key={instanceId}
                    onDragOver={(e) => handleDragOver(e, assemblyId, instanceId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, assemblyId, instanceId)}
                    className={cn(
                      "p-4 border rounded-lg transition-all",
                      isDropTarget 
                        ? "border-blue-500 bg-blue-500/5 border-dashed" 
                        : "border-slate-800 bg-slate-950/60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-200">
                        {instance.instanceLabel || `Instance ${idx + 1}`}
                      </span>
                      {isDropTarget && (
                        <span className="text-xs text-blue-400">Drop I/O here</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {ioSectionKeys.map(sectionKey => {
                        const fields = ioSelections[sectionKey] || [];
                        const Icon = sectionIcons[sectionKey];
                        const instanceFields = instance.fields || {};
                        const activeCount = countActiveIoPoints(fields, instanceFields);

                        return (
                          <div key={sectionKey} className="p-3 border rounded-lg border-slate-800 bg-slate-900/40">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-medium text-slate-300">{sectionTitles[sectionKey]}</span>
                              <span className="ml-auto text-xs text-slate-500">{activeCount}/{fields.length}</span>
                            </div>
                            
                            {fields.length === 0 ? (
                              <p className="text-xs text-center text-slate-600">Drop here</p>
                            ) : (
                              <div className="space-y-1">
                                {fields.slice(0, 3).map((field, fieldIdx) => (
                                  <div key={fieldIdx} className="flex items-center justify-between text-xs text-slate-400">
                                    <span className="truncate">{field.fieldName}</span>
                                    <button
                                      onClick={() => handleRemoveIOField(assemblyId, instanceId, sectionKey, fieldIdx)}
                                      className="p-0.5 hover:text-red-400"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {fields.length > 3 && (
                                  <p className="text-xs text-center text-slate-600">+{fields.length - 3} more</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN QUOTE CONFIGURATOR
// ============================================================================

export default function QuoteConfigurator({ context }) {
  const [quote, setQuote] = useState({
    id: null,
    quoteId: '',
    customer: '',
    projectName: '',
    salesRep: '',
    status: 'Draft',
    projectCodes: { industry: null, product: null, control: null, scope: null },
    controlPanelConfig: {},
    productConfiguration: {},
    bom: []
  });

  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);
  const [schemas, setSchemas] = useState({ industry: [], product: [], control: [], scope: [] });
  const [customers, setCustomers] = useState([]);
  const [panelOptions, setPanelOptions] = useState({});
  const [defaultIOFields, setDefaultIOFields] = useState({
    digitalIn: [],
    analogIn: [],
    digitalOut: [],
    analogOut: []
  });
  const [generatedNumber, setGeneratedNumber] = useState('');
  const [operationalItems, setOperationalItems] = useState([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [industry, product, control, scope, c, options, ioFields] = await Promise.all([
          window.schemas.getIndustry(),
          window.schemas.getProduct(),
          window.schemas.getControl(),
          window.schemas.getScope(),
          window.customers.getAll(),
          window.schemas.getPanelOptions(),
          window.schemas.getDefaultIoFields()
        ]);
        
        setSchemas({
          industry: normalizeSchemaOptions(industry),
          product: normalizeSchemaOptions(product),
          control: normalizeSchemaOptions(control),
          scope: normalizeSchemaOptions(scope)
        });
        setCustomers(c);
        setPanelOptions(options);
        setDefaultIOFields(ioFields);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Load template when product code changes
  useEffect(() => {
    const loadTemplate = async () => {
      const productCode = quote.projectCodes.product;
      if (!productCode) {
        setCurrentTemplate(null);
        return;
      }
      
      try {
        const template = await window.productTemplates.get(productCode);
        setCurrentTemplate(template || {
          productCode,
          productName: 'New Template',
          assemblies: [],
          estimatedBaseLaborHours: 0
        });
      } catch (error) {
        console.error('Error loading template:', error);
      }
    };
    
    loadTemplate();
  }, [quote.projectCodes.product]);

  const updateProductConfiguration = useCallback((configOrUpdater) => {
    setQuote(prev => ({
      ...prev,
      productConfiguration: typeof configOrUpdater === 'function'
        ? configOrUpdater(prev.productConfiguration)
        : configOrUpdater
    }));
  }, []);

  const handleAddIOToAssembly = (ioItem) => {
    console.log('Quick add I/O to assembly:', ioItem);
    // This would add to the currently active/selected assembly
  };

  const handleSave = async () => {
    try {
      await window.quotes.save(quote);
      alert('Quote saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save quote');
    }
  };

  const handleLoad = async () => {
    const quoteId = window.prompt('Enter Quote ID:');
    if (!quoteId?.trim()) return;

    try {
      const loaded = await window.quotes.getById(quoteId.trim());
      if (loaded) {
        setQuote(loaded);
        setGeneratedNumber(loaded.quoteId || '');
        setOperationalItems(loaded.operationalItems || []);
      }
    } catch (error) {
      console.error('Load failed:', error);
      alert('Failed to load quote');
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950">
      {/* LEFT DRAWER - I/O Library */}
      <aside
        className="fixed top-0 bottom-0 left-0 z-20 transition-all duration-