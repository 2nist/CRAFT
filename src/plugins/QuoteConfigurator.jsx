import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PanelRightClose, PanelRightOpen, PanelLeftOpen, PanelLeftClose, Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { IOLibraryDrawer } from '../components/IOLibraryDrawer';

const DESKTOP_BREAKPOINT = '(min-width: 1280px)';
const RIGHT_DRAWER_WIDTH = 352;
const RIGHT_DRAWER_OFFSETS = { top: 65, right: 24, bottomGap: 0 };
const LEFT_DRAWER_OFFSETS = { top: 65, left: 150, bottomGap: 0 };
const LEFT_DRAWER_WIDTH = 360;
const LEFT_DRAWER_HANDLE_WIDTH = 28;

// Normalizes schema entries so dropdowns always receive a `code` field.
const normalizeSchemaOptions = (options = []) =>
  options.map(option => {
    const code = option.code ?? option.const;
    return code !== undefined ? { ...option, code } : option;
  });

const collectSubAssembliesFromConfig = (config = {}) => {
  const ids = new Set();

  Object.entries(config || {}).forEach(([key, value]) => {
    if (key === 'engineeringHours' || key === 'programmingHours' || key === 'productionHours') {
      return;
    }

    const capture = (selected = []) => {
      selected.forEach(id => {
        if (id) {
          ids.add(id);
        }
      });
    };

    if (Array.isArray(value)) {
      value.forEach(instance => capture(instance?.selectedSubAssemblies));
    } else if (value && typeof value === 'object') {
      capture(value.selectedSubAssemblies);
    }
  });

  return ids;
};

const buildRuleEntryKey = (entry = {}) => {
  const assemblyId = entry.sourceAssemblyId || entry.assemblyId || 'assembly';
  const instanceId = entry.sourceInstanceId || 'all';
  const subAssemblyId = entry.subAssemblyId || 'sub';
  return `${assemblyId}:${instanceId}:${subAssemblyId}`;
};

const ensureSubAssembliesInConfig = (productConfiguration = {}, entries = [], currentTemplate) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { config: productConfiguration, addedEntries: new Set() };
  }

  const nextConfig = { ...productConfiguration };
  const addedEntries = new Set();
  let hasChanges = false;

  const templateAssemblies = Array.isArray(currentTemplate?.assemblies) ? currentTemplate.assemblies : [];
  const customAssemblies = Array.isArray(productConfiguration?.__customAssemblies) ? productConfiguration.__customAssemblies : [];

  const requiredLookup = new Map();
  [...templateAssemblies, ...customAssemblies].forEach(assembly => {
    if (!assembly?.assemblyId) return;
    const required = new Set(assembly.subAssemblies?.required || []);
    requiredLookup.set(assembly.assemblyId, required);
  });

  const mergeWithRequired = (selected = [], assemblyId) => {
    const required = requiredLookup.get(assemblyId);
    const merged = new Set((selected || []).filter(Boolean));
    if (required) {
      required.forEach(id => merged.add(id));
    }
    return Array.from(merged);
  };

  entries.forEach(entry => {
    const assemblyId = entry?.sourceAssemblyId || entry?.assemblyId;
    const subAssemblyId = entry?.subAssemblyId;
    if (!assemblyId || !subAssemblyId) {
      return;
    }

    const entryKey = buildRuleEntryKey(entry);
    const currentValue = nextConfig[assemblyId];
    let entryChanged = false;

    if (Array.isArray(currentValue)) {
      let matchedInstance = false;

      const updatedInstances = currentValue.map(instance => {
        if (!instance) {
          return instance;
        }

        const originalSelected = Array.isArray(instance.selectedSubAssemblies)
          ? [...instance.selectedSubAssemblies]
          : [];

        const matchesInstance = entry.sourceInstanceId
          ? instance.instanceId === entry.sourceInstanceId
          : true;

        let nextSelected = [...originalSelected];

        if (matchesInstance) {
          matchedInstance = true;
          if (!nextSelected.includes(subAssemblyId)) {
            nextSelected.push(subAssemblyId);
          }
        }

        nextSelected = mergeWithRequired(nextSelected, assemblyId);

        const changed =
          nextSelected.length !== originalSelected.length ||
          nextSelected.some(id => !originalSelected.includes(id));

        if (changed) {
          entryChanged = true;
          hasChanges = true;
          return { ...instance, selectedSubAssemblies: nextSelected };
        }

        return instance;
      });

      if (!matchedInstance) {
        if (entry.sourceInstanceId) {
          updatedInstances.push({
            instanceId: entry.sourceInstanceId,
            fields: {},
            selectedSubAssemblies: mergeWithRequired([subAssemblyId], assemblyId)
          });
          entryChanged = true;
          hasChanges = true;
        } else if (updatedInstances.length === 0) {
          updatedInstances.push({
            instanceId: `${assemblyId}_${Date.now()}`,
            fields: {},
            selectedSubAssemblies: mergeWithRequired([subAssemblyId], assemblyId)
          });
          entryChanged = true;
          hasChanges = true;
        }
      }

      if (entryChanged) {
        nextConfig[assemblyId] = updatedInstances;
      }
    } else if (currentValue && typeof currentValue === 'object') {
      const originalSelected = Array.isArray(currentValue.selectedSubAssemblies)
        ? [...currentValue.selectedSubAssemblies]
        : [];

      let nextSelected = [...originalSelected];
      if (!nextSelected.includes(subAssemblyId)) {
        nextSelected.push(subAssemblyId);
      }
      nextSelected = mergeWithRequired(nextSelected, assemblyId);

      const changed =
        nextSelected.length !== originalSelected.length ||
        nextSelected.some(id => !originalSelected.includes(id));

      if (changed) {
        nextConfig[assemblyId] = {
          ...currentValue,
          selectedSubAssemblies: nextSelected
        };
        entryChanged = true;
        hasChanges = true;
      }
    } else {
      nextConfig[assemblyId] = [{
        instanceId: entry.sourceInstanceId || `${assemblyId}_${Date.now()}`,
        fields: {},
        selectedSubAssemblies: mergeWithRequired([subAssemblyId], assemblyId)
      }];
      entryChanged = true;
      hasChanges = true;
    }

    if (entryChanged) {
      addedEntries.add(entryKey);
    }
  });

  return {
    config: hasChanges ? nextConfig : productConfiguration,
    addedEntries
  };
};

const generateUniqueId = (prefix = 'field') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

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

// Merge existing instance I/O definitions with template defaults and catalog fallbacks.
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

  if (field.value !== undefined) {
    return field.value;
  }

  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  return null;
};

const countActiveIoPoints = (fields = [], instanceFields = {}) => {
  return fields.reduce((sum, field) => {
    if (!field) {
      return sum;
    }

    const value = getFieldEffectiveValue(field, instanceFields);
    const type = (field.fieldType || '').toLowerCase();

    switch (type) {
      case 'boolean':
        return sum + ((value === true || value === 'true') ? 1 : 0);
      case 'number': {
        const numeric = Number(value ?? 0);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          return sum;
        }
        return sum + Math.floor(numeric);
      }
      case 'list':
        return sum + (value ? 1 : 0);
      case 'text':
      default:
        return sum + (value ? 1 : 0);
    }
  }, 0);
};

// Helper Components
const SelectCode = ({ label, value, onFieldChange, options, fieldName }) => {
  const renderOptions = (opts) => opts.map(option => (
    <option key={option.code ?? option.const} value={option.code ?? option.const}>
      {option.description} ({option.code ?? option.const})
    </option>
  ));

  return (
    <div className="w-full">
      <select
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        value={value ?? ""}
        onChange={e => {
          const selectedValue = e.target.value;
          if (selectedValue === "") {
            onFieldChange(fieldName, "");
            return;
          }
          const parsed = parseInt(selectedValue, 10);
          onFieldChange(fieldName, Number.isNaN(parsed) ? "" : parsed);
        }}
      >
        <option value="" disabled>{label}</option>
        {renderOptions(options)}
      </select>
    </div>
  );
};

const SelectCustomer = ({ label, value, onFieldChange, customers }) => {
  return (
    <div className="w-full">
      <select
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        value={value || ""}
        onChange={e => {
          const custId = e.target.value;
          const cust = customers.find(c => c.id === custId);
          onFieldChange("customer", custId);
          onFieldChange("projectName", (prev) => prev || `${cust.name} - New Project`);
        }}
      >
        <option value="" disabled>{label}</option>
        {customers.map(customer => (
          <option key={customer.id} value={customer.id}>
            {customer.name} ({customer.id})
          </option>
        ))}
      </select>
    </div>
  );
};

const Input = ({ value, onFieldChange, fieldName, type = "text", placeholder = "" }) => {
  return (
    <div className="w-full">
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, e.target.value)}
      />
    </div>
  );
};

const Select = ({ label, value, onFieldChange, fieldName, children }) => {
  return (
    <div className="w-full">
      <select
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, e.target.value)}
      >
        <option value="" disabled>{label}</option>
        {children}
      </select>
    </div>
  );
};

// Step 1: Project Details
function ProjectDetails({
  quote,
  setQuote,
  schemas,
  customers,
  generatedNumber,
  setGeneratedNumber,
  panelOptions,
  onToggleLeftDrawer,
  onToggleRightDrawer,
  isLeftDrawerOpen,
  isRightDrawerOpen
}) {
  const handleFieldChange = (field, value) => {
    setQuote(prev => ({
      ...prev,
      [field]: typeof value === 'function' ? value(prev[field]) : value
    }));
  };

  const handleCodeChange = (field, value) => {
    setQuote(prev => ({
      ...prev,
      projectCodes: { ...prev.projectCodes, [field]: value }
    }));
  };

  const handlePanelFieldChange = (field, value) => {
    setQuote(prev => ({
      ...prev,
      controlPanelConfig: {
        ...prev.controlPanelConfig,
        [field]: value
      }
    }));
  };

  const generateQuoteId = async () => {
    const data = {
      customerCode: quote.customer,
      ...quote.projectCodes
    };

    const result = await window.calc.getQuoteNumber(data);
    setGeneratedNumber(result.fullId);
    setQuote(prev => ({ ...prev, quoteId: result.fullId }));
  };

  const safePanelOptions = {
    voltage: Array.isArray(panelOptions?.voltage) ? panelOptions.voltage : [],
    phase: Array.isArray(panelOptions?.phase) ? panelOptions.phase : [],
    enclosureType: Array.isArray(panelOptions?.enclosureType) ? panelOptions.enclosureType : [],
    enclosureRating: Array.isArray(panelOptions?.enclosureRating) ? panelOptions.enclosureRating : [],
    hmiSize: Array.isArray(panelOptions?.hmiSize) ? panelOptions.hmiSize : [],
    plcPlatform: Array.isArray(panelOptions?.plcPlatform) ? panelOptions.plcPlatform : []
  };

  return (
    <div className="border shadow-lg rounded-2xl border-border bg-card/60 shadow-slate-950/30">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border/70">
        <h3 className="text-lg font-semibold text-foreground">Core Project Details</h3>
        {(onToggleLeftDrawer || onToggleRightDrawer) && (
          <div className="flex items-center gap-2 sm:hidden">
            {onToggleLeftDrawer && (
              <button
                type="button"
                onClick={onToggleLeftDrawer}
                aria-pressed={!!isLeftDrawerOpen}
                className="inline-flex items-center justify-center border rounded-lg h-9 w-9 border-border bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                aria-label={isLeftDrawerOpen ? 'Collapse quote editor drawer' : 'Expand quote editor drawer'}
              >
                {isLeftDrawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>
            )}
            {onToggleRightDrawer && (
              <button
                type="button"
                onClick={onToggleRightDrawer}
                aria-pressed={!!isRightDrawerOpen}
                className="inline-flex items-center justify-center border rounded-lg h-9 w-9 border-border bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                aria-label={isRightDrawerOpen ? 'Collapse summary drawer' : 'Expand summary drawer'}
              >
                {isRightDrawerOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="px-6 py-6 space-y-8">
        <section className="space-y-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Project Basics</p>
          <SelectCustomer
            label="Select customer..."
            value={quote.customer}
            onFieldChange={handleFieldChange}
            customers={customers}
          />
          <Input
            fieldName="projectName"
            value={quote.projectName}
            onFieldChange={handleFieldChange}
            placeholder="E.g., Brewhouse Expansion"
          />
          <Input
            fieldName="salesRep"
            value={quote.salesRep}
            onFieldChange={handleFieldChange}
            placeholder="Your name"
          />
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Project Codes</p>
          <SelectCode
            label="Select industry..."
            fieldName="industry"
            value={quote.projectCodes.industry}
            onFieldChange={handleCodeChange}
            options={schemas.industry}
          />
          <SelectCode
            label="Select product..."
            fieldName="product"
            value={quote.projectCodes.product}
            onFieldChange={handleCodeChange}
            options={schemas.product}
          />
          <SelectCode
            label="Select control..."
            fieldName="control"
            value={quote.projectCodes.control}
            onFieldChange={handleCodeChange}
            options={schemas.control}
          />
          <SelectCode
            label="Select scope..."
            fieldName="scope"
            value={quote.projectCodes.scope}
            onFieldChange={handleCodeChange}
            options={schemas.scope}
          />
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <button
              onClick={generateQuoteId}
              disabled={!quote.customer}
              className="gap-2"
            >
              Generate Quote Number
            </button>
            {generatedNumber && (
              <div className="inline-flex items-center px-3 py-2 border rounded-xl border-emerald-500/30 bg-emerald-500/10">
                <span className="font-mono text-lg text-emerald-300">{generatedNumber}</span>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Panel Specifications</p>
          <Select 
            label="Select voltage..." 
            fieldName="voltage" 
            value={quote.controlPanelConfig.voltage} 
            onFieldChange={handlePanelFieldChange}
          >
            <option value="" disabled>Select voltage...</option>
            {safePanelOptions.voltage.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select 
            label="Select phase..." 
            fieldName="phase" 
            value={quote.controlPanelConfig.phase} 
            onFieldChange={handlePanelFieldChange}
          >
            <option value="" disabled>Select phase...</option>
            {safePanelOptions.phase.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select 
            label="Select enclosure type..." 
            fieldName="enclosureType" 
            value={quote.controlPanelConfig.enclosureType} 
            onFieldChange={handlePanelFieldChange}
          >
            <option value="" disabled>Select enclosure type...</option>
            {safePanelOptions.enclosureType.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select 
            label="Select enclosure rating..." 
            fieldName="enclosureRating" 
            value={quote.controlPanelConfig.enclosureRating} 
            onFieldChange={handlePanelFieldChange}
          >
            <option value="" disabled>Select rating...</option>
            {safePanelOptions.enclosureRating.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select 
            label="Select HMI size..." 
            fieldName="hmiSize" 
            value={quote.controlPanelConfig.hmiSize} 
            onFieldChange={handlePanelFieldChange}
          >
            <option value="" disabled>Select HMI size...</option>
            {safePanelOptions.hmiSize.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select 
            label="Select PLC platform..." 
            fieldName="plcPlatform" 
            value={quote.controlPanelConfig.plcPlatform} 
            onFieldChange={handlePanelFieldChange}
          >
            <option value="" disabled>Select PLC platform...</option>
            {safePanelOptions.plcPlatform.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </section>
      </div>
    </div>
  );
}

// Step 2: Panel Configuration
// Step 3: Product Configuration Form (Dynamic Form Renderer)
function ProductConfigurationForm({ currentTemplate, productConfiguration, setProductConfiguration, defaultIOFields }) {
  // Removed debug console.log that was causing repeated output

  const templateAssemblies = React.useMemo(
    () => (Array.isArray(currentTemplate?.assemblies) ? currentTemplate.assemblies : []),
    [currentTemplate?.assemblies]
  );

  const customAssemblies = React.useMemo(() => {
    const list = productConfiguration?.__customAssemblies;
    return Array.isArray(list) ? list : [];
  }, [productConfiguration?.__customAssemblies]);

  const assembliesToRender = React.useMemo(() => {
    return [...templateAssemblies, ...customAssemblies];
  }, [templateAssemblies, customAssemblies]);

  const assemblyDefinitionMap = React.useMemo(() => {
    const map = new Map();
    assembliesToRender.forEach(assembly => {
      if (assembly?.assemblyId) {
        map.set(assembly.assemblyId, assembly);
      }
    });
    return map;
  }, [assembliesToRender]);

  const [isAddAssemblyOpen, setIsAddAssemblyOpen] = React.useState(false);
  const [assemblyDialogTab, setAssemblyDialogTab] = React.useState('library');
  const [assemblyLibrary, setAssemblyLibrary] = React.useState([]);
  const [assemblyLibraryLoading, setAssemblyLibraryLoading] = React.useState(false);
  const [assemblySearchTerm, setAssemblySearchTerm] = React.useState('');
  const [customAssemblyName, setCustomAssemblyName] = React.useState('');
  const [customAssemblyDescription, setCustomAssemblyDescription] = React.useState('');
  const [customAllowMultiple, setCustomAllowMultiple] = React.useState(true);
  const [activeInstanceModal, setActiveInstanceModal] = React.useState(null);
  const [dropTargetInstance, setDropTargetInstance] = React.useState(null);
  const [editingField, setEditingField] = React.useState(null); // { assemblyId, instanceId, sectionKey, fieldIndex }
  const [draggedField, setDraggedField] = React.useState(null); // { assemblyId, instanceId, sectionKey, fieldIndex }

  const ioSectionKeys = React.useMemo(() => ['digitalIn', 'analogIn', 'digitalOut', 'analogOut'], []);

  const aggregatedIoCounts = React.useMemo(() => {
    const totals = ioSectionKeys.reduce((acc, key) => {
      acc[key] = { active: 0, total: 0 };
      return acc;
    }, {});

    assembliesToRender.forEach(assembly => {
      if (!assembly?.assemblyId) {
        return;
      }

      const instances = Array.isArray(productConfiguration[assembly.assemblyId])
        ? productConfiguration[assembly.assemblyId]
        : [];

      instances.forEach(instance => {
        if (!instance) {
          return;
        }

        const instanceFields = instance.fields || {};
        const ioSelections = ensureIoSelections(instance, assembly, defaultIOFields);

        ioSectionKeys.forEach(sectionKey => {
          const sectionFields = Array.isArray(ioSelections[sectionKey]) ? ioSelections[sectionKey] : [];
          const activePoints = countActiveIoPoints(sectionFields, instanceFields);
          const totalPoints = Math.max(sectionFields.length, activePoints);
          totals[sectionKey].total += totalPoints;
          totals[sectionKey].active += activePoints;
        });
      });
    });

    return totals;
  }, [assembliesToRender, productConfiguration, defaultIOFields, ioSectionKeys]);

  const createUniqueAssemblyId = React.useCallback((seed = 'assembly') => {
    const formatted = seed
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'assembly';

    const existingIds = new Set(assembliesToRender.map(item => item.assemblyId));
    let candidate = `custom_${formatted}`;
    let counter = 2;

    while (existingIds.has(candidate)) {
      candidate = `custom_${formatted}_${counter}`;
      counter += 1;
    }

    return candidate;
  }, [assembliesToRender]);

  const addAssemblyDefinition = React.useCallback((assemblyDefinition, { initialLabel } = {}) => {
    if (!assemblyDefinition?.assemblyId) {
      return;
    }

    setProductConfiguration(prev => {
      const existingCustom = Array.isArray(prev.__customAssemblies) ? prev.__customAssemblies : [];
      const alreadyPresent = existingCustom.some(item => item.assemblyId === assemblyDefinition.assemblyId);
      const nextCustom = alreadyPresent ? existingCustom : [...existingCustom, assemblyDefinition];

      const existingInstances = prev[assemblyDefinition.assemblyId];
      const requiredList = assemblyDefinition.subAssemblies?.required || [];

      if (!Array.isArray(existingInstances) || existingInstances.length === 0) {
        const baseLabel = initialLabel || assemblyDefinition.displayName || assemblyDefinition.assemblyId;
        const newInstance = {
          instanceId: `${assemblyDefinition.assemblyId}_1`,
          instanceLabel: baseLabel,
          fields: {},
          selectedSubAssemblies: [...requiredList],
          ioSelections: ensureIoSelections({}, assemblyDefinition, defaultIOFields)
        };

        return {
          ...prev,
          __customAssemblies: nextCustom,
          [assemblyDefinition.assemblyId]: [newInstance]
        };
      }

      return {
        ...prev,
        __customAssemblies: nextCustom
      };
    });
  }, [defaultIOFields, setProductConfiguration]);

  const handleRemoveCustomAssemblyDefinition = React.useCallback((assemblyId) => {
    setProductConfiguration(prev => {
      const currentCustom = Array.isArray(prev.__customAssemblies) ? prev.__customAssemblies : [];
      const filteredCustom = currentCustom.filter(item => item.assemblyId !== assemblyId);

      const { [assemblyId]: _removedInstances, __customAssemblies: _ignore, ...remaining } = prev;

      if (filteredCustom.length > 0) {
        return {
          ...remaining,
          __customAssemblies: filteredCustom
        };
      }

      return remaining;
    });
  }, [setProductConfiguration]);

  const handleOpenAddAssemblyDialog = React.useCallback(() => {
    setAssemblyDialogTab('library');
    setAssemblySearchTerm('');
    setIsAddAssemblyOpen(true);
  }, []);

  const handleCloseAddAssemblyDialog = React.useCallback(() => {
    setIsAddAssemblyOpen(false);
    setAssemblySearchTerm('');
  }, []);

  const handleSelectSavedAssembly = React.useCallback((entry) => {
    if (!entry) {
      return;
    }

    const seed = entry.description || entry.subAssemblyId || entry.assemblyId || 'assembly';
    const assemblyId = createUniqueAssemblyId(seed);
    const displayName = entry.description || seed;

    const assemblyDefinition = {
      assemblyId,
      displayName,
      description: entry.category || '',
      allowMultiple: true,
      fields: {},
      subAssemblies: {
        required: [entry.subAssemblyId || entry.assemblyId].filter(Boolean),
        optional: []
      },
      sourceType: 'library',
      sourceRef: entry.subAssemblyId || entry.assemblyId
    };

    addAssemblyDefinition(assemblyDefinition, { initialLabel: displayName });
    handleCloseAddAssemblyDialog();
  }, [addAssemblyDefinition, createUniqueAssemblyId, handleCloseAddAssemblyDialog]);

  const handleCreateCustomAssembly = React.useCallback(() => {
    const name = customAssemblyName.trim();
    if (!name) {
      alert('Please provide a name for the custom assembly.');
      return;
    }

    const assemblyId = createUniqueAssemblyId(name);
    const assemblyDefinition = {
      assemblyId,
      displayName: name,
      description: customAssemblyDescription.trim(),
      allowMultiple: customAllowMultiple,
      fields: {},
      subAssemblies: {
        required: [],
        optional: []
      },
      sourceType: 'custom'
    };

    addAssemblyDefinition(assemblyDefinition, { initialLabel: name });
    setCustomAssemblyName('');
    setCustomAssemblyDescription('');
    setCustomAllowMultiple(true);
    handleCloseAddAssemblyDialog();
  }, [addAssemblyDefinition, createUniqueAssemblyId, customAllowMultiple, customAssemblyDescription, customAssemblyName, handleCloseAddAssemblyDialog]);

  const handleInstanceLabelChange = React.useCallback((assemblyId, instanceId, label) => {
    setProductConfiguration(prev => {
      const instances = prev[assemblyId];
      if (!Array.isArray(instances)) {
        return prev;
      }

      const index = instances.findIndex(inst => inst.instanceId === instanceId);
      if (index === -1) {
        return prev;
      }

      const updatedInstances = [...instances];
      updatedInstances[index] = {
        ...updatedInstances[index],
        instanceLabel: label
      };

      return {
        ...prev,
        [assemblyId]: updatedInstances
      };
    });
  }, [setProductConfiguration]);

    const handleOpenInstanceModal = React.useCallback((assemblyId, instanceId) => {
      setActiveInstanceModal({ assemblyId, instanceId });
    }, []);

    const handleCloseInstanceModal = React.useCallback(() => {
      setActiveInstanceModal(null);
    }, []);

  // Drag-drop handlers for I/O Library integration
  const handleDragOver = React.useCallback((e, assemblyId, instanceId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetInstance({ assemblyId, instanceId });
  }, []);

  const handleDragLeave = React.useCallback((e) => {
    e.preventDefault();
    setDropTargetInstance(null);
  }, []);

  const handleDrop = React.useCallback((e, assemblyId, instanceId) => {
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
        const ioSelections = instance.ioSelections || { 
          digitalIn: [], analogIn: [], digitalOut: [], analogOut: [] 
        };
        
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
    } catch (error) {
      console.error('Failed to parse dropped data:', error);
    }
  }, [setProductConfiguration]);

  const handleRemoveIOField = React.useCallback((assemblyId, instanceId, category, fieldIndex) => {
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

  // Field editing handlers
  const handleStartEditField = React.useCallback((assemblyId, instanceId, sectionKey, fieldIndex) => {
    setEditingField({ assemblyId, instanceId, sectionKey, fieldIndex });
  }, []);

  const handleUpdateField = React.useCallback((assemblyId, instanceId, sectionKey, fieldIndex, updates) => {
    setProductConfiguration(prev => {
      const instances = Array.isArray(prev[assemblyId]) ? prev[assemblyId] : [];
      const instanceIndex = instances.findIndex(inst => inst.instanceId === instanceId);
      
      if (instanceIndex === -1) return prev;

      const updatedInstances = [...instances];
      const instance = updatedInstances[instanceIndex];
      const ioSelections = instance.ioSelections || {};
      const categoryFields = [...(ioSelections[sectionKey] || [])];

      if (fieldIndex >= 0 && fieldIndex < categoryFields.length) {
        categoryFields[fieldIndex] = {
          ...categoryFields[fieldIndex],
          ...updates
        };
      }

      updatedInstances[instanceIndex] = {
        ...instance,
        ioSelections: {
          ...ioSelections,
          [sectionKey]: categoryFields
        }
      };

      return {
        ...prev,
        [assemblyId]: updatedInstances
      };
    });
  }, [setProductConfiguration]);

  const handleStopEditField = React.useCallback(() => {
    setEditingField(null);
  }, []);

  // Field reordering handlers
  const handleFieldDragStart = React.useCallback((assemblyId, instanceId, sectionKey, fieldIndex) => {
    setDraggedField({ assemblyId, instanceId, sectionKey, fieldIndex });
  }, []);

  const handleFieldDragOver = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFieldDrop = React.useCallback((assemblyId, instanceId, sectionKey, targetIndex) => {
    if (!draggedField || 
        draggedField.assemblyId !== assemblyId || 
        draggedField.instanceId !== instanceId || 
        draggedField.sectionKey !== sectionKey ||
        draggedField.fieldIndex === targetIndex) {
      setDraggedField(null);
      return;
    }

    setProductConfiguration(prev => {
      const instances = Array.isArray(prev[assemblyId]) ? prev[assemblyId] : [];
      const instanceIndex = instances.findIndex(inst => inst.instanceId === instanceId);
      
      if (instanceIndex === -1) {
        setDraggedField(null);
        return prev;
      }

      const updatedInstances = [...instances];
      const instance = updatedInstances[instanceIndex];
      const ioSelections = instance.ioSelections || {};
      const categoryFields = [...(ioSelections[sectionKey] || [])];

      const sourceIndex = draggedField.fieldIndex;
      if (sourceIndex >= 0 && sourceIndex < categoryFields.length && targetIndex >= 0 && targetIndex < categoryFields.length) {
        const [movedField] = categoryFields.splice(sourceIndex, 1);
        categoryFields.splice(targetIndex, 0, movedField);
      }

      updatedInstances[instanceIndex] = {
        ...instance,
        ioSelections: {
          ...ioSelections,
          [sectionKey]: categoryFields
        }
      };

      setDraggedField(null);
      return {
        ...prev,
        [assemblyId]: updatedInstances
      };
    });
  }, [draggedField, setProductConfiguration]);
  
  // Initialize assembly instances when template or custom assemblies change
  React.useEffect(() => {
    if (!currentTemplate) {
      return;
    }

    const templateAssemblies = Array.isArray(currentTemplate?.assemblies) ? currentTemplate.assemblies : [];
    const customAssemblies = Array.isArray(productConfiguration?.__customAssemblies) ? productConfiguration.__customAssemblies : [];
    const allAssemblies = [...templateAssemblies, ...customAssemblies];

    if (allAssemblies.length === 0) {
      return;
    }

    setProductConfiguration(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      allAssemblies.forEach(assembly => {
        if (!assembly?.assemblyId) {
          return;
        }

        const assemblyId = assembly.assemblyId;
        const requiredSubAssemblies = assembly.subAssemblies?.required || [];
        const currentInstances = Array.isArray(updated[assemblyId]) ? updated[assemblyId] : [];

        const buildInstance = (instance = {}, index = 0) => {
          const mergedSelected = [
            ...requiredSubAssemblies,
            ...((instance.selectedSubAssemblies || []).filter(id => !requiredSubAssemblies.includes(id)))
          ];

          const baseLabel = instance.instanceLabel || `${assembly.displayName || assemblyId} ${index + 1}`;

          return {
            instanceId: instance.instanceId || `${assemblyId}_${index + 1}`,
            instanceLabel: baseLabel,
            fields: instance.fields || {},
            selectedSubAssemblies: mergedSelected,
            ioSelections: ensureIoSelections(instance, assembly, defaultIOFields)
          };
        };

        if (currentInstances.length === 0) {
          updated[assemblyId] = [buildInstance({ instanceId: `${assemblyId}_1`, instanceLabel: `${assembly.displayName || assemblyId} 1` }, 0)];
          hasChanges = true;
          return;
        }

        const nextInstances = currentInstances.map((existing, idx) => buildInstance(existing, idx));
        updated[assemblyId] = nextInstances;
      });

      return hasChanges ? updated : prev;
    });
  }, [currentTemplate, productConfiguration?.__customAssemblies, defaultIOFields, setProductConfiguration]);

  React.useEffect(() => {
    if (!isAddAssemblyOpen) {
      return;
    }

    let cancelled = false;

    const loadLibrary = async () => {
      setAssemblyLibraryLoading(true);
      try {
        const results = await window.subAssemblies.getAll();
        if (!cancelled) {
          setAssemblyLibrary(Array.isArray(results) ? results : []);
        }
      } catch (error) {
        console.error('Error loading assembly library:', error);
        if (!cancelled) {
          setAssemblyLibrary([]);
        }
      } finally {
        if (!cancelled) {
          setAssemblyLibraryLoading(false);
        }
      }
    };

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [isAddAssemblyOpen]);

  const handleFieldChange = (fieldName, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderField = (field = {}) => {
    if (!field?.fieldName) {
      return null;
    }

    const value = productConfiguration[field.fieldName] ?? '';

    switch (field.fieldType) {
      case 'List':
        return (
          <select
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          >
            <option value="">Select {field.fieldName}...</option>
            {field.listOptions?.map((option, idx) => (
              <option key={idx} value={option.value || option.name}>
                {option.label || option.name}
              </option>
            ))}
          </select>
        );

      case 'Number':
        return (
          <input
            type="number"
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            placeholder={field.defaultValue !== undefined ? String(field.defaultValue) : '0'}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          />
        );

      case 'Text':
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            placeholder={field.defaultValue || ''}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          />
        );

      case 'Boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={e => handleFieldChange(field.fieldName, e.target.checked)}
              className="w-4 h-4 mr-2"
            />
            <span className="text-sm text-muted-foreground">Enabled</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          />
        );
    }
  };

  // Handle field change for assembly-scoped fields (v2.0 - instance-based or assembly-level)
  const handleAssemblyFieldChange = (assemblyId, instanceId, fieldName, value) => {
    // If no instanceId, treat as assembly-level field (Step 2)
    if (!instanceId) {
      setProductConfiguration(prev => {
        // Create assembly-level structure if it doesn't exist
        if (!prev[assemblyId] || typeof prev[assemblyId] !== 'object' || Array.isArray(prev[assemblyId])) {
          return {
            ...prev,
            [assemblyId]: { [fieldName]: value }
          };
        }
        // Update assembly-level field
        return {
          ...prev,
          [assemblyId]: {
            ...prev[assemblyId],
            [fieldName]: value
          }
        };
      });
      return;
    }

    // Instance-based logic (Step 3+)
    setProductConfiguration(prev => {
      const instances = prev[assemblyId] || [];
      const instanceIndex = instances.findIndex(inst => inst.instanceId === instanceId);
      
      if (instanceIndex === -1) {
        // Instance doesn't exist, create it
        const newInstances = [...instances, {
          instanceId,
          fields: { [fieldName]: value },
          selectedSubAssemblies: []
        }];
        return { ...prev, [assemblyId]: newInstances };
      }

      // Update existing instance
      const updatedInstances = [...instances];
      updatedInstances[instanceIndex] = {
        ...updatedInstances[instanceIndex],
        fields: {
          ...updatedInstances[instanceIndex].fields,
          [fieldName]: value
        }
      };
      return { ...prev, [assemblyId]: updatedInstances };
    });
  };

  // Get field value for assembly-scoped fields (v2.0 - instance-based or assembly-level)
  const getAssemblyFieldValue = (assemblyId, instanceId, fieldName) => {
    // If no instanceId, treat as assembly-level field (Step 2)
    if (!instanceId) {
      const assemblyData = productConfiguration[assemblyId];
      if (assemblyData && typeof assemblyData === 'object' && !Array.isArray(assemblyData)) {
        return assemblyData[fieldName] || '';
      }
      return '';
    }

    // Instance-based logic (Step 3+)
    const instances = productConfiguration[assemblyId] || [];
    const instance = instances.find(inst => inst.instanceId === instanceId);
    return instance?.fields?.[fieldName] || '';
  };

  // Add new assembly instance (v2.0)
  const handleAddAssemblyInstance = (assemblyId) => {
    const assembly = assemblyDefinitionMap.get(assemblyId);
    if (!assembly) {
      console.warn('Unable to locate assembly definition for', assemblyId);
      return;
    }

    const requiredSubAssemblies = assembly.subAssemblies?.required || [];

    setProductConfiguration(prev => {
      const instances = prev[assemblyId] || [];
      const instanceNumber = instances.length + 1;
      const newInstanceId = `${assemblyId}_${instanceNumber}`;
      const labelBase = assembly.displayName || 'Assembly';

      const newInstance = {
        instanceId: newInstanceId,
        instanceLabel: `${labelBase} ${instanceNumber}`,
        fields: {},
        selectedSubAssemblies: [...requiredSubAssemblies],
        ioSelections: ensureIoSelections({}, assembly, defaultIOFields)
      };

      return {
        ...prev,
        [assemblyId]: [...instances, newInstance]
      };
    });
  };

  // Remove assembly instance (v2.0)
  const handleRemoveAssemblyInstance = (assemblyId, instanceId) => {
    setProductConfiguration(prev => {
      const instances = prev[assemblyId] || [];
      if (instances.length <= 1) {
        // Don't allow removing the last instance
        return prev;
      }

      // Remove instance and clean up I/O instances
      const filteredInstances = instances.filter(inst => inst.instanceId !== instanceId);

      return { ...prev, [assemblyId]: filteredInstances };
    });
  };

  // Render field scoped to assembly instance (v2.0)
  const renderFieldScoped = (field, assemblyId, instanceId) => {
    const value = getAssemblyFieldValue(assemblyId, instanceId, field.fieldName);

    switch (field.fieldType) {
      case 'List':
        return (
          <select
            value={value}
            onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.value)}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          >
            <option value="">Select {field.fieldName}...</option>
            {field.listOptions?.map((option, idx) => (
              <option key={idx} value={option.value || option.name}>
                {option.label || option.name}
              </option>
            ))}
          </select>
        );

      case 'Number':
        return (
          <input
            type="number"
            value={value}
            onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.value)}
            placeholder={field.defaultValue !== undefined ? String(field.defaultValue) : '0'}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          />
        );

      case 'Text':
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.value)}
            placeholder={field.defaultValue || ''}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          />
        );

      case 'Boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.checked)}
              className="w-4 h-4 mr-2"
            />
            <span className="text-sm text-muted-foreground">Enabled</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.value)}
            className="w-full p-2 text-foreground bg-background border border-border rounded-md"
          />
        );
    }
  };

  // Render I/O section grouped by category for clarity
  const renderIOSection = (sectionKey, sectionTitle, fields, assemblyId = null, instanceId = null) => {
    if (!fields || fields.length === 0) {
      return null;
    }

    // Check if this is an I/O section
    const isIOSection = ['digitalIn', 'analogIn', 'digitalOut', 'analogOut'].includes(sectionKey);
    
    // Use assembly-scoped handlers if assemblyId is provided (v2.0)
    const fieldHandler = assemblyId ? (field) => renderFieldScoped(field, assemblyId, instanceId) : renderField;
    
    if (isIOSection) {
      const uniqueKey = (assemblyId && instanceId) ? `${assemblyId}-${instanceId}-${sectionKey}` : (assemblyId ? `${assemblyId}-${sectionKey}` : sectionKey);

      const sectionStyles = {
        digitalIn: {
          border: 'border-blue-500/40',
          chip: 'bg-blue-500/10 text-blue-200'
        },
        analogIn: {
          border: 'border-emerald-500/40',
          chip: 'bg-emerald-500/10 text-emerald-200'
        },
        digitalOut: {
          border: 'border-amber-500/40',
          chip: 'bg-amber-500/10 text-amber-200'
        },
        analogOut: {
          border: 'border-purple-500/40',
          chip: 'bg-purple-500/10 text-purple-200'
        }
      };
      const palette = sectionStyles[sectionKey] || { border: 'border-border', chip: 'bg-muted text-muted-foreground' };

      return (
        <div
          key={uniqueKey}
          className={`p-5 space-y-4 rounded-xl border ${palette.border} bg-card shadow-inner`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-foreground">{sectionTitle}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${palette.chip}`}>
                {fields.length} {fields.length === 1 ? 'point' : 'points'}
              </span>
            </div>
            <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              I/O Definition
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map((field, idx) => {
              const isEditing = editingField && 
                editingField.assemblyId === assemblyId && 
                editingField.instanceId === instanceId && 
                editingField.sectionKey === sectionKey && 
                editingField.fieldIndex === idx;
              
              const isDragging = draggedField && 
                draggedField.assemblyId === assemblyId && 
                draggedField.instanceId === instanceId && 
                draggedField.sectionKey === sectionKey && 
                draggedField.fieldIndex === idx;

              return (
                <div
                  key={idx}
                  draggable={!!assemblyId && !!instanceId}
                  onDragStart={() => assemblyId && instanceId && handleFieldDragStart(assemblyId, instanceId, sectionKey, idx)}
                  onDragOver={handleFieldDragOver}
                  onDrop={() => assemblyId && instanceId && handleFieldDrop(assemblyId, instanceId, sectionKey, idx)}
                  className={`p-4 space-y-3 border rounded-lg transition-all cursor-move ${
                    isDragging 
                      ? 'opacity-50 border-primary' 
                      : 'border-border bg-card hover:border-primary'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={field.fieldName}
                        onChange={(e) => handleUpdateField(assemblyId, instanceId, sectionKey, idx, { fieldName: e.target.value })}
                        placeholder="Field Name"
                        className="w-full px-2 py-1 text-sm font-semibold text-foreground border rounded bg-background border-border focus:border-primary focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={field.description || ''}
                        onChange={(e) => handleUpdateField(assemblyId, instanceId, sectionKey, idx, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 text-xs text-foreground border rounded bg-background border-border focus:border-primary focus:outline-none"
                      />
                      <input
                        type="text"
                        value={field.defaultValue || ''}
                        onChange={(e) => handleUpdateField(assemblyId, instanceId, sectionKey, idx, { defaultValue: e.target.value })}
                        placeholder="Default Value (optional)"
                        className="w-full px-2 py-1 text-xs text-foreground border rounded bg-background border-border focus:border-primary focus:outline-none"
                      />
                      <button
                        onClick={handleStopEditField}
                        className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{field.fieldName}</p>
                          {field.description && (
                            <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {assemblyId && instanceId && (
                            <>
                              <button
                                onClick={() => handleStartEditField(assemblyId, instanceId, sectionKey, idx)}
                                className="p-1 text-muted-foreground hover:text-primary"
                                title="Edit field"
                              >
                                <Settings className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleRemoveIOField(assemblyId, instanceId, sectionKey, idx)}
                                className="p-1 text-muted-foreground hover:text-destructive"
                                title="Remove field"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {field.defaultValue !== undefined && field.defaultValue !== '' && (
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground ml-1">
                              Default: {field.defaultValue}
                            </span>
                          )}
                        </div>
                      </div>
                      {fieldHandler(field)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Regular section rendering for non-I/O fields
    const containerClass = (assemblyId && instanceId) ? "p-4 bg-secondary rounded-lg" : "p-4 mb-6 bg-card rounded-lg shadow";
    const uniqueKey = (assemblyId && instanceId) ? `${assemblyId}-${instanceId}-${sectionKey}` : (assemblyId ? `${assemblyId}-${sectionKey}` : sectionKey);
    return (
      <div key={uniqueKey} className={containerClass}>
        <h3 className="mb-4 text-lg font-semibold text-foreground">{sectionTitle}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field, idx) => (
            <div key={idx} className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                {field.fieldName}
              </label>
              {fieldHandler(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const filteredAssemblyLibrary = React.useMemo(() => {
    const list = Array.isArray(assemblyLibrary) ? assemblyLibrary : [];
    const term = assemblySearchTerm.trim().toLowerCase();
    if (!term) {
      return list;
    }

    return list.filter(entry => {
      const id = (entry.subAssemblyId || entry.assemblyId || '').toLowerCase();
      const description = (entry.description || '').toLowerCase();
      const category = (entry.category || '').toLowerCase();
      return id.includes(term) || description.includes(term) || category.includes(term);
    });
  }, [assemblyLibrary, assemblySearchTerm]);

  // Show loading state if no template
  if (!currentTemplate) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please select a product in Step 1 to configure.</p>
      </div>
    );
  }

  // Map section keys to display titles
  const sectionTitles = {
    digitalIn: 'Digital Inputs',
    analogIn: 'Analog Inputs',
    digitalOut: 'Digital Outputs',
    analogOut: 'Analog Outputs',
    product: 'Product Configuration',
    control: 'Control Configuration',
    optional: 'Optional Configuration'
  };

  const formatSectionTitle = (key) => {
    if (sectionTitles[key]) {
      return sectionTitles[key];
    }

    if (typeof key !== 'string') {
      return 'Configuration';
    }

    const spaced = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .trim();

    return spaced
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Configuration';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Assembly Configuration</h3>
          <p className="text-sm text-muted-foreground">Add saved assemblies or create custom process cards when templates are missing.</p>
        </div>
        <button onClick={handleOpenAddAssemblyDialog} className="gap-2 text-primary hover:text-primary/80">
          + Add Assembly
        </button>
      </div>

      {ioSectionKeys.some(key => aggregatedIoCounts[key]?.total > 0) && (
        <div className="flex flex-wrap gap-2">
          {ioSectionKeys.map(sectionKey => {
            const data = aggregatedIoCounts[sectionKey] || { active: 0, total: 0 };
            const label = formatSectionTitle(sectionKey);
            return (
              <span
                key={sectionKey}
                className="px-3 py-1 text-xs font-semibold tracking-wide border rounded-full text-primary border-border bg-muted"
              >
                {label}: {data.active}
                {data.total > 0 ? ` / ${data.total}` : ''}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-6">
        {(() => {
          console.log('[v2.0 UI] Rendering assemblies:', {
            templateCount: templateAssemblies.length,
            customCount: customAssemblies.length,
            assemblyIds: assembliesToRender.map(item => item.assemblyId),
            productConfiguration
          });
          return null;
        })()}

        {assembliesToRender.map(assembly => {
          if (!assembly || !assembly.assemblyId) {
            return null;
          }

          const assemblyId = assembly.assemblyId;
          const configValue = productConfiguration[assemblyId];
          const instances = Array.isArray(configValue) ? configValue : [];
          const availableSections = ioSectionKeys;
          const assemblyFields = assembly.fields || {};
          const isCustomAssembly = assembly.sourceType === 'custom' || assembly.sourceType === 'library';

          return (
            <div key={assemblyId} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{assembly.displayName || assemblyId}</h2>
                    {assembly.sourceType === 'custom' && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-amber-200 border border-amber-500/40 rounded-full bg-amber-500/10">
                        Custom
                      </span>
                    )}
                    {assembly.sourceType === 'library' && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-500/40 rounded-full bg-emerald-500/10">
                        Saved
                      </span>
                    )}
                  </div>
                  {assembly.description && (
                    <p className="text-sm text-muted-foreground">{assembly.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {assembly.allowMultiple !== false && (
                    <button onClick={() => handleAddAssemblyInstance(assemblyId)} className="gap-2 text-primary hover:text-primary/80">
                      + Add Instance
                    </button>
                  )}
                  {isCustomAssembly && (
                    <button
                      onClick={() => handleRemoveCustomAssemblyDefinition(assemblyId)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove Assembly
                    </button>
                  )}
                </div>
              </div>

              {instances.length === 0 ? (
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <p className="text-sm text-center text-muted-foreground">
                    No instances configured. {assembly.allowMultiple !== false ? 'Add an instance to start configuring.' : 'This assembly requires at least one instance.'}
                  </p>
                </div>
              ) : (
                instances.map((instance, instanceIndex) => {
                  const instanceId = instance.instanceId || `${assemblyId}_${instanceIndex + 1}`;
                  const availableSections = ioSectionKeys;
                  const instanceIoSelections = instance.ioSelections || ensureIoSelections(instance, assembly, defaultIOFields);
                  const nonIoSections = Object.entries(assemblyFields)
                    .filter(([sectionKey, fields]) => !availableSections.includes(sectionKey) && Array.isArray(fields) && fields.length > 0);

                  const instanceFieldValues = instance.fields || {};

                  const summarySections = availableSections
                    .map(sectionKey => {
                      const fields = Array.isArray(instanceIoSelections[sectionKey]) ? instanceIoSelections[sectionKey] : [];
                      if (fields.length === 0) {
                        return null;
                      }
                      const activePoints = countActiveIoPoints(fields, instanceFieldValues);
                      const totalPoints = Math.max(fields.length, activePoints);
                      return {
                        key: sectionKey,
                        label: formatSectionTitle(sectionKey),
                        active: activePoints,
                        total: totalPoints
                      };
                    })
                    .filter(Boolean);

                  const nonIoCount = nonIoSections.reduce((total, [, fields]) => total + (Array.isArray(fields) ? fields.length : 0), 0);
                  const hasConfiguration = summarySections.length > 0 || nonIoCount > 0;
                  const instanceLabel = instance.instanceLabel || `${assembly.displayName || assemblyId} ${instanceIndex + 1}`;
                  const isDropTarget = dropTargetInstance?.assemblyId === assemblyId && dropTargetInstance?.instanceId === instanceId;

                  return (
                    <div 
                      key={instanceId} 
                      className={cn(
                        "p-4 border rounded-2xl transition-all",
                        isDropTarget 
                          ? "border-primary bg-primary/5 border-dashed" 
                          : "border-border bg-card"
                      )}
                      onDragOver={(e) => handleDragOver(e, assemblyId, instanceId)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, assemblyId, instanceId)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-10 h-10 text-lg font-bold text-primary-foreground bg-primary rounded-full">
                              {instanceIndex + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Assembly Instance</p>
                              <h3 className="text-lg font-semibold text-foreground">{assembly.displayName || assemblyId}</h3>
                              {isDropTarget && (
                                <p className="text-xs text-primary">Drop I/O field here</p>
                              )}
                            </div>
                          </div>
                          <div className="pt-2">
                            <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                              Instance Name
                            </label>
                            <input
                              type="text"
                              value={instance.instanceLabel ?? ''}
                              onChange={e => handleInstanceLabelChange(assemblyId, instanceId, e.target.value)}
                              placeholder={instanceLabel}
                              className="w-full px-3 py-2 text-sm text-foreground border rounded-md bg-background border-border focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {assembly.allowMultiple !== false && instances.length > 1 && (
                            <button
                              onClick={() => handleRemoveAssemblyInstance(assemblyId, instanceId)}
                              className="text-sm text-destructive hover:text-destructive/80"
                            >
                              Remove
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenInstanceModal(assemblyId, instanceId)}
                            className="px-3 py-2 text-sm font-medium text-primary-foreground border rounded-md border-primary/50 bg-primary/10 hover:bg-primary/20"
                          >
                            View & Edit Details
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {hasConfiguration ? (
                          <div className="flex flex-wrap gap-2">
                            {summarySections.map(section => (
                              <span
                                key={section.key}
                                className="px-3 py-1 text-xs font-semibold border rounded-full border-border bg-muted text-primary"
                              >
                                {section.label}: {section.active}
                                {section.total > 0 ? ` / ${section.total}` : ''}
                              </span>
                            ))}
                            {nonIoCount > 0 && (
                              <span className="px-3 py-1 text-xs font-semibold border rounded-full border-border bg-muted text-primary">
                                Additional Fields: {nonIoCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-center rounded-lg text-muted-foreground bg-muted/60">
                            No configuration inputs added yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}

        {assembliesToRender.length === 0 && (
          <div className="p-8 text-center bg-card rounded-lg">
            <p className="text-muted-foreground">No assemblies configured for this product yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Add a saved assembly or build a custom one to begin configuration.</p>
            <button onClick={handleOpenAddAssemblyDialog} className="gap-2 mt-4 text-primary hover:text-primary/80">
              + Add Assembly
            </button>
          </div>
        )}
      </div>

      {activeInstanceModal && (() => {
        const { assemblyId, instanceId } = activeInstanceModal;
        const assembly = assemblyDefinitionMap.get(assemblyId);
        const instanceList = Array.isArray(productConfiguration[assemblyId]) ? productConfiguration[assemblyId] : [];
        const instanceIndex = instanceList.findIndex(inst => inst.instanceId === instanceId);
        const instance = instanceIndex >= 0 ? instanceList[instanceIndex] : null;

        if (!assembly || !instance) {
          return null;
        }

        const availableSections = ioSectionKeys;
        const assemblyFields = assembly.fields || {};
        const instanceIoSelections = instance.ioSelections || ensureIoSelections(instance, assembly, defaultIOFields);
        const nonIoSections = Object.entries(assemblyFields)
          .filter(([sectionKey, fields]) => !availableSections.includes(sectionKey) && Array.isArray(fields) && fields.length > 0);
        const modalInstanceLabel = instance.instanceLabel || `${assembly.displayName || assemblyId} ${instanceIndex + 1}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/70">
            <div className="w-full max-w-4xl max-h-full p-6 overflow-y-auto border shadow-xl bg-card border-border rounded-2xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Assembly Instance</p>
                  <h3 className="text-xl font-semibold text-foreground">{assembly.displayName || assemblyId}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{modalInstanceLabel}</p>
                </div>
                <button onClick={handleCloseInstanceModal} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="mt-4">
                <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">Instance Name</label>
                <input
                  type="text"
                  value={instance.instanceLabel ?? ''}
                  onChange={e => handleInstanceLabelChange(assemblyId, instanceId, e.target.value)}
                  placeholder={modalInstanceLabel}
                  className="w-full px-3 py-2 text-sm text-foreground border rounded-md bg-background border-border focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-6 space-y-5">
                {availableSections.map(sectionKey => {
                  const fields = instanceIoSelections[sectionKey];
                  if (!Array.isArray(fields) || fields.length === 0) {
                    return null;
                  }
                  return renderIOSection(
                    sectionKey,
                    formatSectionTitle(sectionKey),
                    fields,
                    assemblyId,
                    instanceId
                  );
                })}

                {nonIoSections.map(([sectionKey, fields]) => (
                  renderIOSection(
                    sectionKey,
                    formatSectionTitle(sectionKey),
                    fields,
                    assemblyId,
                    instanceId
                  )
                ))}

                {availableSections.every(sectionKey => {
                  const fields = instanceIoSelections[sectionKey];
                  return !Array.isArray(fields) || fields.length === 0;
                }) && nonIoSections.length === 0 && (
                  <div className="px-4 py-3 text-sm text-center rounded-lg text-muted-foreground bg-muted/60">
                    No configuration inputs defined for this assembly.
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={handleCloseInstanceModal} className="px-4 py-2 text-sm font-medium text-foreground border rounded-md border-border bg-card hover:bg-muted">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isAddAssemblyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-4xl p-6 border shadow-xl bg-card border-border rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Add Assembly</h3>
                <p className="text-sm text-muted-foreground">Select a saved assembly or craft a custom process card.</p>
              </div>
              <button onClick={handleCloseAddAssemblyDialog} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setAssemblyDialogTab('library')}
                className={`px-3 py-1 text-sm rounded-md ${assemblyDialogTab === 'library' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                Saved Assemblies
              </button>
              <button
                onClick={() => setAssemblyDialogTab('custom')}
                className={`px-3 py-1 text-sm rounded-md ${assemblyDialogTab === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                Custom Assembly
              </button>
            </div>

            {assemblyDialogTab === 'library' ? (
              <div className="mt-6 space-y-4">
                <input
                  type="text"
                  value={assemblySearchTerm}
                  onChange={e => setAssemblySearchTerm(e.target.value)}
                  placeholder="Search by ID, description, or category..."
                  className="w-full px-3 py-2 text-sm text-foreground border rounded-md bg-background border-border focus:border-primary focus:outline-none"
                />
                <div className="space-y-2 overflow-y-auto max-h-80">
                  {assemblyLibraryLoading ? (
                    <p className="py-6 text-center text-muted-foreground">Loading saved assemblies…</p>
                  ) : filteredAssemblyLibrary.length === 0 ? (
                    <p className="py-6 text-center text-muted-foreground">No saved assemblies found.</p>
                  ) : (
                    filteredAssemblyLibrary.map(entry => (
                      <div
                        key={entry.subAssemblyId || entry.assemblyId}
                        className="flex items-center justify-between p-3 border rounded-lg bg-card border-border hover:border-primary"
                      >
                        <div className="min-w-0 mr-3">
                          <p className="font-medium text-foreground truncate">{entry.description || entry.subAssemblyId || entry.assemblyId}</p>
                          <p className="text-xs truncate text-muted-foreground">{entry.category || 'Uncategorized'}</p>
                        </div>
                        <button onClick={() => handleSelectSavedAssembly(entry)} className="text-sm text-primary hover:text-primary/80">
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold tracking-wide uppercase text-muted-foreground">Assembly Name</label>
                  <input
                    type="text"
                    value={customAssemblyName}
                    onChange={e => setCustomAssemblyName(e.target.value)}
                    placeholder="e.g., Brewhouse Custom Module"
                    className="w-full px-3 py-2 text-sm text-foreground border rounded-md bg-background border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold tracking-wide uppercase text-muted-foreground">Description (optional)</label>
                  <textarea
                    value={customAssemblyDescription}
                    onChange={e => setCustomAssemblyDescription(e.target.value)}
                    rows={3}
                    placeholder="Add context for this assembly…"
                    className="w-full px-3 py-2 text-sm text-foreground border rounded-md bg-background border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={customAllowMultiple}
                    onChange={e => setCustomAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  Allow multiple instances
                </label>
                <div className="flex justify-end">
                  <button onClick={handleCreateCustomAssembly} className="gap-2 text-primary hover:text-primary/80">
                    Save Assembly
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Step 4: Assembly Selection & BOM
function AssemblySelection({
  currentTemplate,
  productConfiguration,
  setProductConfiguration,
  controlPanelConfig,
  selectedAssemblies,
  setSelectedAssemblies,
  assemblyQuantities,
  setAssemblyQuantities,
  assemblyNotes,
  setAssemblyNotes,
  quote,
  setOperationalItems,
  operationalItems
}) {
  const [availableAssemblies, setAvailableAssemblies] = useState([]);
  const [subAssemblyCatalog, setSubAssemblyCatalog] = useState(() => new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortBy, setSortBy] = useState('description'); // 'description' or 'category'
  const [expandedAssemblies, setExpandedAssemblies] = useState({}); // Track which assemblies are expanded to show components
  const [recommendationFeed, setRecommendationFeed] = useState([]); // Rule-based recommended sub-assemblies with status tracking

  const handleLabourFieldChange = useCallback((field, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [field]: value
    }));
  }, [setProductConfiguration]);

  const customProcessAssemblies = useMemo(() => (
    Array.isArray(productConfiguration.__customAssemblies) ? productConfiguration.__customAssemblies : []
  ), [productConfiguration.__customAssemblies]);

  const processAssemblies = useMemo(() => {
    const base = Array.isArray(currentTemplate?.assemblies) ? currentTemplate.assemblies : [];
    return base.concat(customProcessAssemblies);
  }, [currentTemplate?.assemblies, customProcessAssemblies]);

  const assemblyDefinitionMap = useMemo(() => {
    const map = new Map();
    processAssemblies.forEach(assembly => {
      if (assembly?.assemblyId) {
        map.set(assembly.assemblyId, assembly);
      }
    });
    return map;
  }, [processAssemblies]);

  const engineeringDefault = currentTemplate?.estimatedBaseLaborHours ?? 0;
  const currentEngineeringHours = productConfiguration.engineeringHours ?? engineeringDefault;
  const currentProgrammingHours = productConfiguration.programmingHours ?? 0;
  const currentProductionHours = productConfiguration.productionHours ?? 0;
  const totalLabourHours = (currentEngineeringHours + currentProgrammingHours + currentProductionHours).toFixed(1);

  useEffect(() => {
    const loadAssemblies = async () => {
      if (!currentTemplate) return;
      
      setIsLoading(true);
      try {
        const allAssemblies = await window.subAssemblies.getAll();
        
        // Expand all assemblies to get full component details
        const expandedAssemblies = await Promise.all(
          allAssemblies.map(async (assembly) => {
            try {
              const expanded = await window.subAssemblies.expand(assembly.assemblyId);
              return expanded || assembly; // Fallback to original if expand fails
            } catch (err) {
              console.error(`Failed to expand assembly ${assembly.assemblyId}:`, err);
              return assembly;
            }
          })
        );
        
        setAvailableAssemblies(expandedAssemblies);
        const catalog = new Map();
        expandedAssemblies.forEach(assembly => {
          const id = assembly.subAssemblyId || assembly.assemblyId;
          if (id) {
            catalog.set(id, assembly);
          }
        });
        setSubAssemblyCatalog(catalog);
        
        // Auto-select required assemblies from template
        const autoSelected = [
          ...(currentTemplate.assemblies?.required || [])
        ];
        setSelectedAssemblies(autoSelected);

        // Initialize quantities to 1 for all assemblies
        const initialQuantities = {};
        autoSelected.forEach(id => {
          initialQuantities[id] = 1;
        });
        setAssemblyQuantities(initialQuantities);
      } catch (error) {
        console.error('Error loading assemblies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAssemblies();
  }, [currentTemplate]);

  const handleAddAssembly = (assemblyId) => {
    // Always add assembly, even if already selected (allows duplicates for motors, heaters, etc.)
    setSelectedAssemblies(prev => [...prev, assemblyId]);
    setAssemblyQuantities(prev => ({ ...prev, [assemblyId]: (prev[assemblyId] || 0) + 1 }));
    setShowAddDialog(false);
    setSearchTerm('');
  };

  const handleRemoveAssembly = (assemblyId) => {
    const currentQty = assemblyQuantities[assemblyId] || 1;
    
    if (currentQty > 1) {
      // Decrement quantity
      setAssemblyQuantities(prev => ({ ...prev, [assemblyId]: currentQty - 1 }));
    } else {
      // Remove completely if quantity is 1
      setSelectedAssemblies(prev => prev.filter(id => id !== assemblyId));
      setAssemblyQuantities(prev => {
        const newQty = { ...prev };
        delete newQty[assemblyId];
        return newQty;
      });
      setAssemblyNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[assemblyId];
        return newNotes;
      });
    }
  };

  const handleQuantityChange = (assemblyId, quantity) => {
    const qty = parseInt(quantity) || 1;
    setAssemblyQuantities(prev => ({ ...prev, [assemblyId]: qty }));
  };

  const handleNoteChange = (assemblyId, note) => {
    setAssemblyNotes(prev => ({ ...prev, [assemblyId]: note }));
  };

  const toggleAssemblyExpansion = (assemblyId) => {
    setExpandedAssemblies(prev => ({
      ...prev,
      [assemblyId]: !prev[assemblyId]
    }));
  };

  const handleAcceptRecommendation = (entryId) => {
    const target = recommendationFeed.find(item => item.id === entryId);
    if (!target || target.type !== 'recommended') {
      return;
    }

    let updatedConfigRef = productConfiguration;
    setProductConfiguration(prevConfig => {
      const { config: nextConfig } = ensureSubAssembliesInConfig(prevConfig, [target], currentTemplate);
      updatedConfigRef = nextConfig;
      return nextConfig;
    });

    setRecommendationFeed(prev => {
      const acceptedIds = new Set(collectSubAssembliesFromConfig(updatedConfigRef));
      return prev.map(entry => {
        if (entry.type === 'recommended') {
          const shouldMarkAccepted = entry.id === entryId || acceptedIds.has(entry.subAssemblyId);
          return shouldMarkAccepted ? { ...entry, status: 'accepted' } : entry;
        }
        return entry;
      });
    });
  };

  const handleToggleOptionalSubAssembly = (assemblyId, instanceId, instanceIndex, subAssemblyId) => {
    const assemblyDef = assemblyDefinitionMap.get(assemblyId);
    if (!assemblyDef) {
      return;
    }

    const requiredList = assemblyDef.subAssemblies?.required || [];
    if (requiredList.includes(subAssemblyId)) {
      return;
    }

    let nextConfigSnapshot = productConfiguration;

    setProductConfiguration(prevConfig => {
      const currentValue = prevConfig[assemblyId];
      const requiredSet = new Set(requiredList);

      const applyToggle = (instance, idx = 0) => {
        const key = instance.instanceId || `${assemblyId}_${idx + 1}`;
        if (instanceId && key !== instanceId) {
          return instance;
        }
        if (!instanceId && idx !== instanceIndex) {
          return instance;
        }

        const selected = new Set(instance.selectedSubAssemblies || []);
        if (selected.has(subAssemblyId)) {
          selected.delete(subAssemblyId);
        } else {
          selected.add(subAssemblyId);
        }

        requiredSet.forEach(id => selected.add(id));

        return {
          ...instance,
          selectedSubAssemblies: Array.from(selected)
        };
      };

      let nextAssemblyValue;

      if (Array.isArray(currentValue)) {
        nextAssemblyValue = currentValue.map((instance, idx) => applyToggle(instance, idx));
      } else if (currentValue && typeof currentValue === 'object') {
        nextAssemblyValue = applyToggle(currentValue, 0);
      } else {
        const baseSelected = new Set(requiredList);
        baseSelected.add(subAssemblyId);
        nextAssemblyValue = [{
          instanceId: instanceId || `${assemblyId}_${Date.now()}`,
          fields: {},
          selectedSubAssemblies: Array.from(baseSelected)
        }];
      }

      const updatedConfig = {
        ...prevConfig,
        [assemblyId]: nextAssemblyValue
      };

      nextConfigSnapshot = updatedConfig;
      return updatedConfig;
    });

    setRecommendationFeed(prev => {
      const acceptedIds = new Set(collectSubAssembliesFromConfig(nextConfigSnapshot));
      return prev.map(entry => {
        if (entry.type === 'recommended' && entry.sourceAssemblyId === assemblyId) {
          const matchesInstance = !entry.sourceInstanceId || entry.sourceInstanceId === instanceId;
          if (acceptedIds.has(entry.subAssemblyId)) {
            return { ...entry, status: 'accepted' };
          }
          if (matchesInstance) {
            return { ...entry, status: 'pending' };
          }
        }
        return entry;
      });
    });
  };

  const escapeCsvValue = (value) => {
    if (value === undefined || value === null) {
      return '';
    }

    const stringValue = typeof value === 'string' ? value : String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || /[\r\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const exportOperationalItemsCsv = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No operational items to export');
    }

    const csvRows = [];
    csvRows.push('SKU,Description,Display Name,Quantity,Unit Price,Total Price,Vendor,VN#,Category,Section Group,Source Assembly,Source Rule,Notes');

    items.forEach(item => {
      const row = [
        item?.sku || '',
        item?.description || '',
        item?.displayName || '',
        item?.quantity ?? 0,
        typeof item?.unitPrice === 'number' ? item.unitPrice.toFixed(2) : item?.unitPrice || '',
        typeof item?.totalPrice === 'number' ? item.totalPrice.toFixed(2) : item?.totalPrice || '',
        item?.vendor || '',
        item?.vndrnum || '',
        item?.category || '',
        item?.sectionGroup || 'Other',
        item?.sourceAssembly || '',
        item?.sourceRule || '',
        item?.notes || ''
      ].map(escapeCsvValue);
      csvRows.push(row.join(','));
    });

    const totalMaterialCost = items.reduce((sum, item) => sum + (item?.totalPrice || 0), 0);
    csvRows.push('');
    const summaryRow = [
      'Total Material Cost',
      '',
      '',
      '',
      '',
      totalMaterialCost.toFixed(2),
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ].map(escapeCsvValue);
    csvRows.push(summaryRow.join(','));

    const identifierParts = [];
    if (quote.quoteId) {
      identifierParts.push(quote.quoteId);
    } else if (generatedNumber) {
      identifierParts.push(generatedNumber);
    }
    if (quote.projectName) {
      identifierParts.push(quote.projectName);
    }

    const rawIdentifier = identifierParts.join('_') || 'OperationalItems';
    const safeIdentifier = rawIdentifier.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'OperationalItems';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
    const filename = `BOM_OperationalItems_${safeIdentifier}_${timestamp}.csv`;

    await window.app.writeFile(`OUTPUT/BOMs/${filename}`, csvRows.join('\n'));

    return { filename, itemCount: items.length };
  };

  const handleExportBOM = async () => {
    // Use operationalItems if available, otherwise fall back to assemblies
    if (operationalItems && operationalItems.length > 0) {
      try {
        const { filename, itemCount } = await exportOperationalItemsCsv(operationalItems);
        alert(`BOM exported successfully to OUTPUT/BOMs/${filename}\n\nExported ${itemCount} operational items.`);
      } catch (error) {
        console.error('Error exporting BOM:', error);
        alert(`Failed to export BOM: ${error.message}`);
      }
    } else if (selectedAssemblies.length === 0) {
      alert('No BOM to export. Please generate the BOM first by clicking "Generate BOM".');
      return;
    } else {
      // Fallback to old assembly-based export if operationalItems not available
    try {
      const uniqueIds = [...new Set(selectedAssemblies)];
      
      // Expand assemblies to get full component details
      const expandedAssemblies = await Promise.all(
        uniqueIds.map(id => window.subAssemblies.expand(id))
      );
      
      const assemblyObjects = expandedAssemblies.filter(Boolean);

      const csvRows = [];

      csvRows.push('Assembly ID,Assembly Description,Assembly Category,Assembly Qty,Assembly Notes,Component SKU,Component Description,Component Vendor,Component VN#,Component Qty');

      assemblyObjects.forEach(assembly => {
        const assemblyQty = assemblyQuantities[assembly.assemblyId] || 1;
        const assemblyNote = assemblyNotes[assembly.assemblyId] || '';
        
        if (assembly.components && assembly.components.length > 0) {
          assembly.components.forEach(comp => {
            const component = comp.component; // Expanded component details (can be null)
            const row = [
              assembly.assemblyId,
              assembly.description,
              assembly.category,
              assemblyQty,
              assemblyNote,
              comp.sku,
              component ? component.description : comp.sku,
              component ? component.vendor : 'Unknown',
              component ? (component.attributes?.vndrnum || component.vndrnum || '') : '',
              comp.quantity || 1
            ].map(escapeCsvValue);
            csvRows.push(row.join(','));
          });
        } else {
          const row = [
            assembly.assemblyId,
            assembly.description,
            assembly.category,
            assemblyQty,
            assemblyNote,
            '',
            '',
            '',
            '',
            ''
          ].map(escapeCsvValue);
          csvRows.push(row.join(','));
        }
      });

      const csvContent = csvRows.join('\n');

      const identifierParts = [];
      if (quote.quoteId) {
        identifierParts.push(quote.quoteId);
      } else if (generatedNumber) {
        identifierParts.push(generatedNumber);
      }
      if (quote.projectName) {
        identifierParts.push(quote.projectName);
      }

      const rawIdentifier = identifierParts.join('_') || 'Assemblies';
      const safeIdentifier = rawIdentifier.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'Assemblies';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
      const filename = `BOM_Assemblies_${safeIdentifier}_${timestamp}.csv`;

      await window.app.writeFile(`OUTPUT/BOMs/${filename}`, csvContent);

        alert(`BOM exported successfully to OUTPUT/BOMs/${filename}\n\nNote: Using assembly-based export. Generate BOM for consolidated operational items.`);
    } catch (error) {
      console.error('Error exporting BOM:', error);
      alert(`Failed to export BOM: ${error.message}`);
      }
    }
  };

  // Export quote to CSV
  const handleExportQuoteToCsv = async () => {
    if (!quote || !quote.quoteId) {
      alert('No quote data to export. Please create or load a quote first.');
      return;
    }

    try {
      const csvRows = [];
      
      // Header row
      csvRows.push('Section,Field,Value,Index');
      
      // Basic quote metadata
      const basicFields = [
        'quoteId', 'projectId', 'projectName', 'customer', 'salesRep', 'oem', 'status'
      ];
      
      basicFields.forEach(field => {
        csvRows.push(`Quote,${field},${quote[field] || ''},`);
      });
      
      // Project codes
      if (quote.projectCodes) {
        csvRows.push(`Quote,projectCodes.industry,${quote.projectCodes.industry || ''},`);
        csvRows.push(`Quote,projectCodes.product,${quote.projectCodes.product || ''},`);
        csvRows.push(`Quote,projectCodes.control,${quote.projectCodes.control || ''},`);
        csvRows.push(`Quote,projectCodes.scope,${quote.projectCodes.scope || ''},`);
      }
      
      // Control panel config
      if (quote.controlPanelConfig) {
        Object.entries(quote.controlPanelConfig).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle nested objects like ioCapacity
            Object.entries(value).forEach(([subKey, subValue]) => {
              csvRows.push(`ControlPanel,${key}.${subKey},${subValue || ''},`);
            });
          } else if (Array.isArray(value)) {
            // Handle arrays like networkProtocols
            value.forEach((item, index) => {
              csvRows.push(`ControlPanel,${key}[${index}],${item || ''},`);
            });
          } else {
            csvRows.push(`ControlPanel,${key},${value || ''},`);
          }
        });
      }
      
      // Product configuration
      if (quote.productConfiguration) {
        ['motors', 'heaters', 'inputs', 'outputs'].forEach(arrayField => {
          if (quote.productConfiguration[arrayField]) {
            quote.productConfiguration[arrayField].forEach((item, index) => {
              Object.entries(item).forEach(([key, value]) => {
                csvRows.push(`ProductConfig,${arrayField}[${index}].${key},${value || ''},`);
              });
            });
          }
        });
      }
      
      // Selected sub-assemblies
      if (quote.selectedSubAssemblies) {
        quote.selectedSubAssemblies.forEach((assembly, index) => {
          Object.entries(assembly).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle nested objects like configuration
              Object.entries(value).forEach(([subKey, subValue]) => {
                csvRows.push(`SubAssemblies,${key}.${subKey},${subValue || ''},${index}`);
              });
            } else if (Array.isArray(value)) {
              // Handle arrays like selectedFeatures
              value.forEach((item, subIndex) => {
                csvRows.push(`SubAssemblies,${key}[${subIndex}],${item || ''},${index}`);
              });
            } else {
              csvRows.push(`SubAssemblies,${key},${value || ''},${index}`);
            }
          });
        });
      }
      
      // Custom features
      if (quote.customFeatures) {
        quote.customFeatures.forEach((feature, index) => {
          Object.entries(feature).forEach(([key, value]) => {
            csvRows.push(`CustomFeatures,${key},${value || ''},${index}`);
          });
        });
      }
      
      // Operational items
      if (quote.operationalItems) {
        quote.operationalItems.forEach((item, index) => {
          Object.entries(item).forEach(([key, value]) => {
            csvRows.push(`OperationalItems,${key},${value || ''},${index}`);
          });
        });
      }
      
      // Pricing
      if (quote.pricing) {
        Object.entries(quote.pricing).forEach(([key, value]) => {
          csvRows.push(`Pricing,${key},${value || ''},`);
        });
      }
      
      // Additional fields
      ['pipedrive_deal_id', 'pipedrive_person_id', 'historical_margin_avg'].forEach(field => {
        if (quote[field] !== undefined && quote[field] !== null) {
          csvRows.push(`Quote,${field},${quote[field]},`);
        }
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
      const filename = `Quote_${quote.quoteId || 'Unknown'}_${timestamp}.csv`;

      await window.app.writeFile(`OUTPUT/Projects/${filename}`, csvRows.join('\n'));

      alert(`Quote exported successfully to OUTPUT/Projects/${filename}\n\nThis CSV can be imported back to restore the quote.`);
    } catch (error) {
      console.error('Failed to export quote:', error);
      alert(`Failed to export quote: ${error.message}`);
    }
  };

  // Import quote from CSV
  const handleImportQuoteFromCsv = async () => {
    try {
      const result = await window.app.showOpenDialog({
        title: 'Select Quote CSV File',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      const csvContent = await window.app.readFile(filePath);
      
      if (!csvContent) {
        alert('Failed to read the selected file.');
        return;
      }

      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('Invalid CSV file format.');
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',');
      if (headers.length < 3 || headers[0] !== 'Section' || headers[1] !== 'Field') {
        alert('Invalid CSV format. Expected columns: Section,Field,Value,Index');
        return;
      }

      const parsedData = {};
      const subAssemblies = [];
      const customFeatures = [];
      const operationalItems = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 3) continue;
        
        const section = cols[0];
        const field = cols[1];
        const value = cols[2];
        const index = cols[3] ? parseInt(cols[3]) : null;

        if (section === 'Quote') {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (!parsedData[parent]) parsedData[parent] = {};
            parsedData[parent][child] = value;
          } else {
            parsedData[field] = value;
          }
        } else if (section === 'ControlPanel') {
          if (!parsedData.controlPanelConfig) parsedData.controlPanelConfig = {};
          
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (parent.includes('[')) {
              // Handle array notation like networkProtocols[0]
              const arrayMatch = parent.match(/^(.+)\[(\d+)\]$/);
              if (arrayMatch) {
                const arrayName = arrayMatch[1];
                const arrayIndex = parseInt(arrayMatch[2]);
                if (!parsedData.controlPanelConfig[arrayName]) parsedData.controlPanelConfig[arrayName] = [];
                parsedData.controlPanelConfig[arrayName][arrayIndex] = value;
              }
            } else {
              if (!parsedData.controlPanelConfig[parent]) parsedData.controlPanelConfig[parent] = {};
              parsedData.controlPanelConfig[parent][child] = value;
            }
          } else {
            parsedData.controlPanelConfig[field] = value;
          }
        } else if (section === 'ProductConfig') {
          if (!parsedData.productConfiguration) parsedData.productConfiguration = {};
          
          const arrayMatch = field.match(/^(.+)\[(\d+)\]\.(.+)$/);
          if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const arrayIndex = parseInt(arrayMatch[2]);
            const propName = arrayMatch[3];
            
            if (!parsedData.productConfiguration[arrayName]) parsedData.productConfiguration[arrayName] = [];
            if (!parsedData.productConfiguration[arrayName][arrayIndex]) parsedData.productConfiguration[arrayName][arrayIndex] = {};
            parsedData.productConfiguration[arrayName][arrayIndex][propName] = value;
          }
        } else if (section === 'SubAssemblies' && index !== null) {
          if (!subAssemblies[index]) subAssemblies[index] = {};
          
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (!subAssemblies[index][parent]) subAssemblies[index][parent] = {};
            subAssemblies[index][parent][child] = value;
          } else if (field.includes('[')) {
            const arrayMatch = field.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
              const arrayName = arrayMatch[1];
              const arrayIndex = parseInt(arrayMatch[2]);
              if (!subAssemblies[index][arrayName]) subAssemblies[index][arrayName] = [];
              subAssemblies[index][arrayName][arrayIndex] = value;
            }
          } else {
            subAssemblies[index][field] = value;
          }
        } else if (section === 'CustomFeatures' && index !== null) {
          if (!customFeatures[index]) customFeatures[index] = {};
          customFeatures[index][field] = value;
        } else if (section === 'OperationalItems' && index !== null) {
          if (!operationalItems[index]) operationalItems[index] = {};
          operationalItems[index][field] = value;
        } else if (section === 'Pricing') {
          if (!parsedData.pricing) parsedData.pricing = {};
          parsedData.pricing[field] = value;
        }
      }

      // Reconstruct the quote object
      const importedQuote = {
        ...parsedData,
        selectedSubAssemblies: subAssemblies.filter(item => Object.keys(item).length > 0),
        customFeatures: customFeatures.filter(item => Object.keys(item).length > 0),
        operationalItems: operationalItems.filter(item => Object.keys(item).length > 0),
        projectCodes: parsedData.projectCodes || {},
        controlPanelConfig: parsedData.controlPanelConfig || {},
        productConfiguration: parsedData.productConfiguration || {},
        pricing: parsedData.pricing || {},
        status: parsedData.status || 'draft'
      };

      // Convert numeric fields back to numbers
      if (importedQuote.projectCodes) {
        Object.keys(importedQuote.projectCodes).forEach(key => {
          const value = importedQuote.projectCodes[key];
          if (value && !isNaN(value)) {
            importedQuote.projectCodes[key] = parseInt(value);
          }
        });
      }

      if (importedQuote.pricing) {
        Object.keys(importedQuote.pricing).forEach(key => {
          const value = importedQuote.pricing[key];
          if (value && !isNaN(value)) {
            importedQuote.pricing[key] = parseFloat(value);
          }
        });
      }

      // Set the imported quote
      setQuote(importedQuote);
      
      // Update generated number if quoteId is present
      if (importedQuote.quoteId) {
        setGeneratedNumber(importedQuote.quoteId);
      }

      alert(`Quote imported successfully from ${filePath.split('\\').pop() || filePath.split('/').pop()}`);
    } catch (error) {
      console.error('Failed to import quote:', error);
      alert(`Failed to import quote: ${error.message}`);
    }
  };

  const handleGenerateBom = async () => {
    if (!currentTemplate) {
      alert('Please select a product in Step 1 before generating BOM.');
      return;
    }
    
    setIsGenerating(true);
    setRecommendationFeed([]);
    try {
      // Step 1: Evaluate sub-assembly rules to get required and recommended sub-assemblies
      console.log('Evaluating sub-assembly rules...');
      const ruleResult = await window.quotes.evaluateSubAssemblyRules(quote);

      if (ruleResult.success) {
        const requiredEntries = ruleResult.requiredSubAssemblies || [];
        const recommendedEntries = ruleResult.recommendedSubAssemblies || [];

        const { config: configWithRequired, addedEntries } = ensureSubAssembliesInConfig(
          productConfiguration,
          requiredEntries,
          currentTemplate
        );

        if (configWithRequired !== productConfiguration) {
          setProductConfiguration(configWithRequired);
        }

        const existingSubAssemblyIds = new Set(collectSubAssembliesFromConfig(configWithRequired));

        const feed = [
          ...requiredEntries.map(entry => ({
            ...entry,
            id: `required:${buildRuleEntryKey(entry)}`,
            type: 'required',
            status: addedEntries.has(buildRuleEntryKey(entry)) ? 'added' : 'retained'
          })),
          ...recommendedEntries.map(entry => ({
            ...entry,
            id: `recommended:${buildRuleEntryKey(entry)}`,
            type: 'recommended',
            status: existingSubAssemblyIds.has(entry.subAssemblyId) ? 'accepted' : 'pending'
          }))
        ];

        setRecommendationFeed(feed);

        const requiredSubAssemblyIds = requiredEntries.map(item => item.subAssemblyId);
        const recommendedSubAssemblyIds = recommendedEntries.map(item => item.subAssemblyId);

        console.log('Rule evaluation result:', {
          required: requiredSubAssemblyIds,
          recommended: recommendedSubAssemblyIds,
          injected: Array.from(addedEntries)
        });

        const quoteForGeneration = configWithRequired === productConfiguration
          ? quote
          : { ...quote, productConfiguration: configWithRequired };

        console.log('Generating Operational Items from instance-based productConfiguration...');
        const bomResult = await window.quotes.generateOperationalItems(quoteForGeneration);

        if (bomResult.success) {
          const items = bomResult.operationalItems || [];
          setOperationalItems(items);
          const itemCount = items.length;

          let exportMessage = '';
          if (itemCount > 0) {
            try {
              const { filename } = await exportOperationalItemsCsv(items);
              exportMessage = `\n\nSaved automatically to OUTPUT/BOMs/${filename}.`;
            } catch (exportError) {
              console.error('Automatic BOM export failed:', exportError);
              exportMessage = '\n\nAutomatic CSV export failed. Use the Export CSV button to save the BOM.';
            }
          }

          alert(`Successfully generated consolidated Bill of Materials with ${itemCount} item${itemCount !== 1 ? 's' : ''}!${exportMessage}`);
        } else {
          console.error('Failed to generate OI list:', bomResult.error);
          alert(`Failed to generate BOM: ${bomResult.error || 'Unknown error'}`);
          setOperationalItems([]);
        }
      } else {
        console.error('Failed to evaluate rules:', ruleResult.error);
        setRecommendationFeed([]);
        alert(`Failed to evaluate sub-assembly rules: ${ruleResult.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Error generating BOM:', error);
      alert(`Failed to generate BOM: ${error.message}`);
      setOperationalItems([]);
      setRecommendationFeed([]);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentTemplate) {
    return (
      <div className="p-8 text-center bg-card rounded-lg">
        <p className="text-muted-foreground">Please select a product in Step 1 to configure assemblies.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-card rounded-lg">
        <p className="text-muted-foreground">Loading assemblies...</p>
      </div>
    );
  }

  // Get unique assembly IDs with their quantities
  const uniqueAssemblyIds = [...new Set(selectedAssemblies)];
  const selectedAssemblyObjects = uniqueAssemblyIds
    .map(id => availableAssemblies.find(a => a.assemblyId === id))
    .filter(Boolean);

  const filteredAvailableAssemblies = availableAssemblies
    .filter(assembly => {
      const matchesSearch = searchTerm === '' || 
        assembly.assemblyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assembly.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assembly.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'category') {
        // Sort by category first, then description
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        return a.description.localeCompare(b.description);
      } else {
        // Sort by description
        return a.description.localeCompare(b.description);
      }
    });

  return (
    <div className="space-y-4">
      {/* BOM Generation Button - Full Width */}
      <div className="p-4 bg-card rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Assembly Selection & BOM</h3>
            <p className="text-sm text-muted-foreground">
              Search and add assemblies to build your Bill of Materials
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportBOM}
              disabled={selectedAssemblies.length === 0}
              className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export BOM CSV
            </button>
            <button
              onClick={handleExportQuoteToCsv}
              disabled={!quote || !quote.quoteId}
              className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Quote CSV
            </button>
            <button
              onClick={handleImportQuoteFromCsv}
              className="px-4 py-2 text-white bg-orange-600 rounded-md hover:bg-orange-700"
            >
              Import Quote CSV
            </button>
            <button
              onClick={handleGenerateBom}
              disabled={isGenerating}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate BOM'}
            </button>
          </div>
        </div>
      </div>

      {processAssemblies.length > 0 && (
        <div className="p-4 space-y-4 bg-card rounded-lg shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold text-foreground">Process Card Overview</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Review each assembly instance and fine-tune optional sub-assemblies that will flow into the consolidated BOM.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {processAssemblies.map((assembly, assemblyIdx) => {
              const configValue = productConfiguration[assembly.assemblyId];
              const instanceList = Array.isArray(configValue)
                ? configValue
                : (configValue && typeof configValue === 'object')
                  ? [configValue]
                  : [];

              const requiredList = assembly.subAssemblies?.required || [];
              const optionalSeed = assembly.subAssemblies?.optional || [];

              return (
                <div key={assembly.assemblyId || assemblyIdx} className="p-4 border rounded-lg border-border bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="text-base font-semibold text-foreground">{assembly.displayName || assembly.assemblyId}</h5>
                      <p className="text-xs text-muted-foreground">{assembly.description || 'No description provided.'}</p>
                    </div>
                    {assembly.allowMultiple && (
                      <span className="px-3 py-1 text-xs font-semibold text-blue-200 border rounded-full border-blue-500/40 bg-blue-500/10">
                        Multiple instances allowed
                      </span>
                    )}
                  </div>

                  {instanceList.length === 0 ? (
                    <div className="p-4 mt-3 text-sm text-muted-foreground border border-dashed rounded-lg border-border">
                      No configuration instances found for this assembly. Configure it in Step 3 to see details here.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {instanceList.map((instance, instanceIndex) => {
                        const instanceId = instance.instanceId || `${assembly.assemblyId}_${instanceIndex + 1}`;
                        const instanceDisplayLabel = instance.instanceLabel?.trim() || `Instance ${instanceIndex + 1}`;
                        const selectedSet = new Set(instance.selectedSubAssemblies || []);
                        const instanceRecommendations = recommendationFeed.filter(entry =>
                          entry.sourceAssemblyId === assembly.assemblyId && (!entry.sourceInstanceId || entry.sourceInstanceId === instanceId)
                        );
                        const recommendedOptionalIds = instanceRecommendations
                          .filter(entry => entry.type === 'recommended')
                          .map(entry => entry.subAssemblyId);
                        const optionalIds = Array.from(new Set([...optionalSeed, ...recommendedOptionalIds]));

                        return (
                          <div key={`${instanceId}-${instanceIndex}`} className="p-3 border rounded-lg border-border bg-secondary">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground">{instanceDisplayLabel}</span>
                                <span className="text-xs text-muted-foreground">{instanceId}</span>
                              </div>
                              {instanceRecommendations.some(rec => rec.type === 'recommended' && rec.status === 'pending') && (
                                <span className="px-3 py-1 text-xs font-semibold text-blue-200 border rounded-full border-blue-500/40 bg-blue-500/10">
                                  Pending recommendations
                                </span>
                              )}
                            </div>

                            <div className="grid gap-3 mt-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Required Sub-Assemblies</span>
                                <div className="flex flex-wrap gap-2">
                                  {requiredList.length === 0 ? (
                                    <span className="px-3 py-1 text-xs text-muted-foreground border rounded-full border-border">
                                      None defined
                                    </span>
                                  ) : (
                                    requiredList.map(requiredId => {
                                      const catalogEntry = subAssemblyCatalog.get(requiredId);
                                      return (
                                        <span
                                          key={`${instanceId}-required-${requiredId}`}
                                          className="px-3 py-1 text-xs font-semibold border rounded-full text-amber-200 border-amber-500/40 bg-amber-500/10"
                                        >
                                          {catalogEntry?.description || requiredId}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Optional Sub-Assemblies</span>
                                {optionalIds.length === 0 ? (
                                  <span className="px-3 py-1 text-xs text-muted-foreground border rounded-full border-border">
                                    No optional sub-assemblies configured
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {optionalIds.map(optionalId => {
                                      const isSelected = selectedSet.has(optionalId);
                                      const catalogEntry = subAssemblyCatalog.get(optionalId);
                                      const recommendation = instanceRecommendations.find(entry => entry.subAssemblyId === optionalId && entry.type === 'recommended');
                                      const isPendingRecommendation = recommendation?.status === 'pending';
                                      const buttonClass = [
                                        'px-3 py-1 text-xs rounded-full border transition-colors',
                                        isSelected
                                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                                          : isPendingRecommendation
                                            ? 'border-blue-500/60 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                                            : 'border-border text-muted-foreground hover:bg-muted'
                                      ].join(' ');

                                      return (
                                        <button
                                          key={`${instanceId}-optional-${optionalId}`}
                                          type="button"
                                          onClick={() => handleToggleOptionalSubAssembly(assembly.assemblyId, instanceId, instanceIndex, optionalId)}
                                          className={buttonClass}
                                        >
                                          {catalogEntry?.description || optionalId}
                                          {isPendingRecommendation && (
                                            <span className="ml-2 text-[10px] font-semibold uppercase text-blue-200">Recommended</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

        {recommendationFeed.length > 0 && (
          <div className="p-4 border rounded-lg shadow bg-card border-blue-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold tracking-wide text-blue-200 uppercase">Rule Insights</h4>
                <p className="mt-1 text-xs text-muted-foreground">Review required inclusions and optional recommendations detected from your configuration.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {recommendationFeed.map(entry => {
                const catalogEntry = subAssemblyCatalog.get(entry.subAssemblyId) || {};
                const description = catalogEntry.description || entry.subAssemblyId;
                const assemblyLabel = entry.sourceAssemblyDisplayName || entry.sourceAssemblyId || 'Assembly';
                const statusChip = entry.type === 'required'
                  ? entry.status === 'added'
                    ? 'Added automatically'
                    : 'Already satisfied'
                  : entry.status === 'accepted'
                    ? 'Accepted'
                    : 'Recommended';
                const statusClass = entry.type === 'required'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : entry.status === 'accepted'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-blue-500/40 bg-blue-500/10 text-blue-200';

                return (
                  <div key={entry.id} className="flex flex-col gap-3 p-3 border rounded-lg bg-secondary border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{description}</span>
                        <span className="text-xs text-muted-foreground">{entry.subAssemblyId}</span>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                        {statusChip}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>Source: {assemblyLabel}</span>
                      {entry.sourceInstanceId && (
                        <span>Instance: {entry.sourceInstanceId}</span>
                      )}
                      {entry.type === 'recommended' && entry.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptRecommendation(entry.id)}
                          className="inline-flex items-center px-3 py-1 ml-auto text-xs font-semibold text-blue-200 border rounded-md border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20"
                        >
                          Add to configuration
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT COLUMN: Assembly Search */}
        <div className="p-4 bg-card rounded-lg shadow">
          <h4 className="mb-4 text-lg font-semibold text-foreground">Available Sub-Assemblies</h4>
          
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search by Assembly ID, Description, or Category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-3 mb-4 text-foreground bg-muted border border-border rounded-md"
          />

          {/* Sort Options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <button
              onClick={() => setSortBy('description')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                sortBy === 'description'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setSortBy('category')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                sortBy === 'category'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Category
            </button>
          </div>

          {/* Assembly List */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {filteredAvailableAssemblies.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {searchTerm ? 'No assemblies match your search.' : 'No assemblies available.'}
              </p>
            ) : (
              filteredAvailableAssemblies.map(assembly => (
                <div key={assembly.assemblyId} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{assembly.description}</p>
                      <span className="px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full whitespace-nowrap">
                        {assembly.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">{assembly.assemblyId}</p>
                  </div>
                  <button
                    onClick={() => handleAddAssembly(assembly.assemblyId)}
                    className="px-3 py-1 ml-2 text-sm text-primary-foreground bg-primary rounded-md hover:bg-primary/90 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Assemblies (BOM) */}
        <div className="p-4 bg-card rounded-lg shadow">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Bill of Materials ({selectedAssemblyObjects.length} types, {selectedAssemblies.length} total)
          </h3>
          
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {selectedAssemblyObjects.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No assemblies selected yet.</p>
                <p className="mt-2 text-sm text-muted-foreground/80">Search and add assemblies from the left</p>
              </div>
            ) : (
              selectedAssemblyObjects.map(assembly => {
                const isRequired = currentTemplate.assemblies?.required?.includes(assembly.assemblyId);
                
                return (
                  <div key={assembly.assemblyId} className="p-4 bg-muted border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{assembly.description}</p>
                          <span className="px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full">
                            {assembly.category}
                          </span>
                          {isRequired && (
                            <span className="px-2 py-1 text-xs font-medium text-destructive-foreground bg-destructive rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{assembly.assemblyId}</p>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveAssembly(assembly.assemblyId)}
                        className="ml-2 text-red-400 hover:text-red-300"
                        title="Remove assembly"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Quantity Input */}
                      <div>
                        <label className="block mb-1 text-sm text-muted-foreground">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={assemblyQuantities[assembly.assemblyId] || 1}
                          onChange={e => handleQuantityChange(assembly.assemblyId, e.target.value)}
                          className="w-full p-2 text-foreground bg-background border border-border rounded-md"
                        />
                      </div>

                      {/* Notes Input */}
                      <div>
                        <label className="block mb-1 text-sm text-muted-foreground">Notes</label>
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={assemblyNotes[assembly.assemblyId] || ''}
                          onChange={e => handleNoteChange(assembly.assemblyId, e.target.value)}
                          className="w-full p-2 text-foreground bg-background border border-border rounded-md"
                        />
                      </div>
                    </div>

                    {/* Components List Toggle */}
                    <div className="mt-3">
                      <button
                        onClick={() => toggleAssemblyExpansion(assembly.assemblyId)}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                      >
                        <span>{expandedAssemblies[assembly.assemblyId] ? '▼' : '▶'}</span>
                        <span>
                          {expandedAssemblies[assembly.assemblyId] ? 'Hide' : 'Show'} Components 
                          ({assembly.components?.length || 0})
                        </span>
                      </button>

                      {expandedAssemblies[assembly.assemblyId] && assembly.components && assembly.components.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border">
                            <div className="col-span-1">Qty</div>
                            <div className="col-span-3">SKU</div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2">Vendor</div>
                            <div className="col-span-1">VN#</div>
                          </div>
                          {assembly.components.map((comp, idx) => {
                            const component = comp.component; // Expanded component details (can be null)
                            return (
                              <div
                                key={`${comp.sku}-${idx}`}
                                className="grid grid-cols-12 gap-2 px-2 py-2 text-xs text-muted-foreground bg-background rounded"
                              >
                                <div className="col-span-1 font-medium">{comp.quantity || 1}</div>
                                <div className="col-span-3 font-mono text-blue-300">{comp.sku}</div>
                                <div className="col-span-5 truncate" title={component?.description || comp.sku}>
                                  {component?.description || comp.sku}
                                </div>
                                <div className="col-span-2 truncate" title={component?.vendor || 'Unknown'}>
                                  {component?.vendor || 'Unknown'}
                                </div>
                                <div className="col-span-1">{component?.attributes?.vndrnum || component?.vndrnum || ''}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Consolidated Operational Items (BOM) Table */}
      <div className="p-4 mt-6 bg-card rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Consolidated Bill of Materials
        </h3>
        
        {operationalItems.length === 0 ? (
          <div className="py-8 text-center bg-muted rounded-lg">
            <p className="text-muted-foreground">No BOM Generated.</p>
            <p className="mt-2 text-sm text-muted-foreground/80">Click 'Generate BOM' above to create the consolidated Bill of Materials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-sm font-semibold text-left text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-muted-foreground">Unit Price</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-muted-foreground">Total Price</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-muted-foreground">Section</th>
                </tr>
              </thead>
              <tbody>
                {operationalItems.map((item, index) => (
                  <tr
                    key={`${item.sku}-${index}`}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-primary">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <div>
                        <div className="font-medium text-foreground">{item.displayName || item.description}</div>
                        {item.description && item.description !== item.displayName && (
                          <div className="mt-1 text-xs text-muted-foreground/80">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                      ${(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-foreground">
                      ${(item.totalPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="px-2 py-1 text-xs bg-muted rounded">
                        {item.sectionGroup || 'Other'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50">
                  <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-right text-muted-foreground">
                    Total Material Cost:
                  </td>
                  <td className="px-4 py-3 text-lg font-bold text-right text-foreground">
                    ${operationalItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="p-6 mt-6 border shadow rounded-2xl border-border bg-card">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Labour Hours</h3>
            <p className="text-sm text-muted-foreground">
              Adjust the labour allowances for this quote. These values roll into pricing alongside the generated BOM.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-foreground">Engineering Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentEngineeringHours}
                onChange={e => handleLabourFieldChange('engineeringHours', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-foreground transition border rounded-lg border-border bg-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <span className="block text-xs text-muted-foreground">Template baseline: {engineeringDefault.toFixed(1)} hrs</span>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-foreground">Programming Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentProgrammingHours}
                onChange={e => handleLabourFieldChange('programmingHours', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-foreground transition border rounded-lg border-border bg-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-foreground">Production Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentProductionHours}
                onChange={e => handleLabourFieldChange('productionHours', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-foreground transition border rounded-lg border-border bg-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg border-border bg-secondary">
            <span className="text-sm font-medium text-muted-foreground">Total Labour Hours</span>
            <span className="text-xl font-semibold text-foreground">{totalLabourHours} hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({ quote, schemas, customers, generatedNumber, operationalItems, className }) {
  const customerName = useMemo(() => {
    if (!quote.customer) return 'Unassigned customer';
    const match = customers.find(c => c.id === quote.customer);
    return match ? match.name : quote.customer;
  }, [customers, quote.customer]);

  const resolveCodeDescription = (list, code) => {
    if (!code) return 'Not selected';
    const entry = list?.find(option => option.code === code);
    if (entry) return `${code} · ${entry.description}`;
    return `${code}`;
  };

  const projectCodes = quote.projectCodes || {};
  const pricing = quote.pricing || {};
  const productConfiguration = quote.productConfiguration || {};
  const bomCount = operationalItems?.length ?? quote.bom?.length ?? 0;

  const formatCurrency = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const normalizedStatus = (() => {
    const status = quote.status || 'Draft';
    const pretty = status.toString().replace(/_/g, ' ');
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  })();

  const statusClass = (() => {
    switch (normalizedStatus.toLowerCase()) {
      case 'quoted':
        return 'border border-blue-500/40 bg-blue-500/10 text-blue-200';
      case 'approved':
        return 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
      case 'lost':
        return 'border border-rose-500/40 bg-rose-500/10 text-rose-200';
      default:
        return 'border border-border bg-secondary text-muted-foreground';
    }
  })();

  const configStats = [
    { label: 'Motors', value: productConfiguration.motors?.length ?? 0 },
    { label: 'Heaters', value: productConfiguration.heaters?.length ?? 0 },
    { label: 'Inputs', value: productConfiguration.inputs?.length ?? 0 },
    { label: 'Outputs', value: productConfiguration.outputs?.length ?? 0 }
  ];

  return (
    <aside className={cn('flex w-full flex-col gap-4', className)}>
      <div className="p-6 border shadow-sm rounded-2xl border-border bg-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide uppercase text-muted-foreground">Quote Snapshot</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{quote.projectName || 'Untitled Quote'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{customerName}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {normalizedStatus}
          </span>
        </div>

        <dl className="mt-6 space-y-3 text-sm text-muted-foreground">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Quote #</dt>
            <dd className="font-medium text-foreground">{quote.quoteId || generatedNumber || 'Not generated'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Sales Rep</dt>
            <dd className="font-medium text-foreground">{quote.salesRep || 'Unassigned'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Material Cost</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pricing.materialCost)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Labor Cost</dt>
            <dd className="font-medium text-foreground">{formatCurrency(pricing.laborCost)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Margin %</dt>
            <dd className="font-medium text-foreground">{pricing.marginPercent ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs tracking-wide uppercase text-muted-foreground">Project Codes</p>
          <div className="mt-2 space-y-2 text-sm">
            <div className="p-3 border rounded-xl border-border bg-secondary">
              <p className="text-xs tracking-wide uppercase text-muted-foreground">Industry</p>
              <p className="mt-1 font-medium text-foreground">
                {resolveCodeDescription(schemas.industry, projectCodes.industry)}
              </p>
            </div>
            <div className="p-3 border rounded-xl border-border bg-secondary">
              <p className="text-xs tracking-wide uppercase text-muted-foreground">Product</p>
              <p className="mt-1 font-medium text-foreground">
                {resolveCodeDescription(schemas.product, projectCodes.product)}
              </p>
            </div>
            <div className="p-3 border rounded-xl border-border bg-secondary">
              <p className="text-xs tracking-wide uppercase text-muted-foreground">Control</p>
              <p className="mt-1 font-medium text-foreground">
                {resolveCodeDescription(schemas.control, projectCodes.control)}
              </p>
            </div>
            <div className="p-3 border rounded-xl border-border bg-secondary">
              <p className="text-xs tracking-wide uppercase text-muted-foreground">Scope</p>
              <p className="mt-1 font-medium text-foreground">
                {resolveCodeDescription(schemas.scope, projectCodes.scope)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border shadow-sm rounded-2xl border-border bg-card">
        <h3 className="text-sm font-semibold text-foreground">Configuration Status</h3>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          {configStats.map(stat => (
            <div key={stat.label} className="p-3 border rounded-xl border-border bg-secondary">
              <p className="text-xs tracking-wide uppercase text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
          <div className="p-3 border rounded-xl border-border bg-secondary">
            <p className="text-xs tracking-wide uppercase text-muted-foreground">BOM Items</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{bomCount}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Total COGS</span>
            <span className="font-medium text-foreground">{formatCurrency(pricing.totalCOGS)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Sell Price</span>
            <span className="font-medium text-foreground">{formatCurrency(pricing.finalPrice)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Main Component
export default function QuoteConfigurator({ context }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [quote, setQuote] = useState({
    id: null,
    quoteId: '',
    customer: '',
    projectName: '',
    salesRep: '',
    status: 'Draft',
    projectCodes: { 
      industry: null, 
      product: null, 
      control: null, 
      scope: null 
    },
    controlPanelConfig: {
      voltage: '',
      phase: '',
      enclosureType: '',
      enclosureRating: '',
      hmiSize: '',
      plcPlatform: ''
    },
    productConfiguration: {},
    bom: []
  });
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [selectedAssemblies, setSelectedAssemblies] = useState([]);
  const [assemblyQuantities, setAssemblyQuantities] = useState({});
  const [assemblyNotes, setAssemblyNotes] = useState({});
  const [operationalItems, setOperationalItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedNumber, setGeneratedNumber] = useState('');
  const [schemas, setSchemas] = useState({ industry: [], product: [], control: [], scope: [] });
  const [customers, setCustomers] = useState([]);
  const [panelOptions, setPanelOptions] = useState({ voltage: [], phase: [], enclosureType: [], enclosureRating: [], hmiSize: [], plcPlatform: [] });
  const [defaultIOFields, setDefaultIOFields] = useState({ digitalIn: [], analogIn: [], digitalOut: [], analogOut: [] });
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeAssembly, setActiveAssembly] = useState(null);
  const [configHistory, setConfigHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  const updateProductConfiguration = useCallback((configOrUpdater) => {
    setQuote(prev => {
      const newConfig = typeof configOrUpdater === 'function'
        ? configOrUpdater(prev.productConfiguration)
        : configOrUpdater;
      
      // Add to history for undo/redo
      setConfigHistory(history => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newConfig);
        // Keep only last 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex(idx => Math.min(idx + 1, 49));
      
      return {
        ...prev,
        productConfiguration: newConfig
      };
    });
  }, [setQuote, historyIndex]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const industry = normalizeSchemaOptions(await window.schemas.getIndustry());
        const product = normalizeSchemaOptions(await window.schemas.getProduct());
        const control = normalizeSchemaOptions(await window.schemas.getControl());
        const scope = normalizeSchemaOptions(await window.schemas.getScope());
        const c = await window.customers.getAll();
        const options = await window.schemas.getPanelOptions();
        const defaultIO = await window.schemas.getDefaultIoFields();
        
        setSchemas({ industry, product, control, scope });
        setCustomers(c);
        setPanelOptions(options);
        setDefaultIOFields(defaultIO);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(DESKTOP_BREAKPOINT);

    const applyBreakpointState = (target) => {
      const matches = target.matches;
      setIsDesktop(matches);
      // Default both drawers to closed regardless of breakpoint
      setIsLeftDrawerOpen(false);
      setIsRightDrawerOpen(false);
    };

    applyBreakpointState(media);
    const handleChange = (event) => applyBreakpointState(event);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Sync selectedAssemblies to quote.bom with full details
  useEffect(() => {
    const buildBomWithDetails = async () => {
      if (selectedAssemblies.length === 0) {
        setQuote(prev => ({ ...prev, bom: [] }));
        return;
      }

      try {
        // Get unique assembly IDs
        const uniqueIds = [...new Set(selectedAssemblies)];
        
        // Build BOM with assembly details, quantities, and notes
        const bomWithDetails = uniqueIds.map(id => ({
          assemblyId: id,
          quantity: assemblyQuantities[id] || 1,
          notes: assemblyNotes[id] || ''
        }));

        setQuote(prev => ({
          ...prev,
          bom: bomWithDetails
        }));
      } catch (error) {
        console.error('Error building BOM:', error);
      }
    };

    buildBomWithDetails();
  }, [selectedAssemblies, assemblyQuantities, assemblyNotes]);

  // Load product template when product code changes
  useEffect(() => {
    const loadTemplate = async () => {
      const productCode = quote.projectCodes.product;
      
      if (!productCode) {
        setCurrentTemplate(null);
        setQuote(prev => ({
          ...prev,
          productConfiguration: {}
        }));
        return;
      }
      
      try {
        const template = await window.productTemplates.get(productCode);
        
        if (template) {
          // Debug: Log template structure
          console.log('[Template Load] Template loaded:', {
            productCode: productCode,
            hasAssemblies: !!template.assemblies,
            assembliesIsArray: Array.isArray(template.assemblies),
            assembliesType: typeof template.assemblies,
            assembliesCount: Array.isArray(template.assemblies) ? template.assemblies.length : 'N/A'
          });
          
          // Ensure template has v2.0 structure (assemblies as array)
          // If template uses old structure, convert it or warn
          if (template.assemblies && !Array.isArray(template.assemblies)) {
            console.warn(`[Template Load] Template ${productCode} uses old structure. Expected assemblies to be an array. Template may not work correctly with v2.0 features.`);
            console.warn('[Template Load] The migration service should have converted this. Check IPC handler.');
          }
          
          setCurrentTemplate(template);
          
          // Initialize productConfiguration with ALL data from template
          // Note: v2.0 uses instance-based structure, so we don't set assemblies here
          setQuote(prev => ({
            ...prev,
            productConfiguration: {
              ...prev.productConfiguration,
              engineeringHours: template.estimatedBaseLaborHours || template.engineeringHours || 0,
              programmingHours: template.programmingHours || 0,
              productionHours: template.productionHours || 0
              // v2.0: assemblies and fields are handled per-instance in ProductConfigurationForm
              // Don't set old-style fields or assemblies here
            }
          }));
        } else {
          // No template found - use default I/O fields
          // v2.0: Create template with empty assemblies array
          setCurrentTemplate({
            productCode: productCode,
            productName: 'New Template (Unsaved)',
            assemblies: [], // v2.0: empty array, not object
            estimatedBaseLaborHours: 0,
            engineeringHours: 0,
            programmingHours: 0,
            productionHours: 0
          });

          setQuote(prev => ({
            ...prev,
            productConfiguration: {
              engineeringHours: 0,
              programmingHours: 0,
              productionHours: 0
            }
          }));
        }
      } catch (error) {
        console.error('Error loading template:', error);
        setCurrentTemplate(null);
      }
    };
    
    loadTemplate();
  }, [quote.projectCodes.product]);

  const steps = [
    { id: 1, title: 'Product Config', description: 'Configure motors, I/O, and assemblies unique to this product.' },
    { id: 2, title: 'BOM Assistance', description: 'Assemble the bill of materials and generate consolidated outputs.' }
  ];

  const activeStep = steps.find(step => step.id === currentStep) || steps[0];
  const nextStep = steps[currentStep] ? steps[currentStep].title : null;
  const nextLabel = currentStep === steps.length
    ? (isLoading ? 'Saving…' : 'Save & Finish')
    : `Continue${nextStep ? ` · ${nextStep}` : ''}`;
  const upcomingStep = steps.find(step => step.id === currentStep + 1) || null;

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return (
          <ProductConfigurationForm
            currentTemplate={currentTemplate}
            productConfiguration={quote.productConfiguration}
            setProductConfiguration={updateProductConfiguration}
            defaultIOFields={defaultIOFields}
          />
        );
      case 2:
        return (
          <AssemblySelection
            currentTemplate={currentTemplate}
            productConfiguration={quote.productConfiguration}
            setProductConfiguration={updateProductConfiguration}
            controlPanelConfig={quote.controlPanelConfig}
            selectedAssemblies={selectedAssemblies}
            setSelectedAssemblies={setSelectedAssemblies}
            assemblyQuantities={assemblyQuantities}
            setAssemblyQuantities={setAssemblyQuantities}
            assemblyNotes={assemblyNotes}
            setAssemblyNotes={setAssemblyNotes}
            quote={quote}
            setOperationalItems={setOperationalItems}
            operationalItems={operationalItems}
          />
        );
      default:
        return null;
    }
  })();

  const displayQuoteNumber = quote.quoteId || generatedNumber || '';
  const selectedCustomer = useMemo(() => {
    if (!Array.isArray(customers)) {
      return null;
    }
    return customers.find(customer => customer.id === quote.customer) || null;
  }, [customers, quote.customer]);
  const operationalCount = Array.isArray(operationalItems) ? operationalItems.length : 0;
  const selectedAssemblyCount = Array.isArray(selectedAssemblies) ? selectedAssemblies.length : 0;

  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === steps.length) {
      // On last step, save and finish
      await handleSave();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToStep = useCallback((targetStep) => {
    if (typeof targetStep !== 'number' || targetStep < 1 || targetStep > steps.length) {
      return;
    }
    setCurrentStep(targetStep);
  }, [steps.length]);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      // --- Validate quote before save ---
      console.log('Validating quote before save...');
      const validationResult = await window.quotes.validate(quote);

      if (validationResult.success && validationResult.validationErrors.length > 0) {
        const errors = validationResult.validationErrors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
          console.error('Validation failed!', errors);
          const errorMessages = errors.map(e => `• ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`).join('\n');
          alert(`Cannot save quote. Please fix the following errors:\n\n${errorMessages}`);
          setMessage('Validation failed. Please fix errors before saving.');
          return; // Stop the save
        }
      } else if (!validationResult.success) {
        console.error('Validation service failed:', validationResult.error);
        alert(`Error during validation: ${validationResult.error}`);
        setMessage('Validation service error. Please try again.');
        return; // Stop the save
      }

      console.log('Validation passed. Proceeding with save...');

      // --- Calculate pricing from operationalItems ---
      const materialCost = operationalItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      
      // Get labor hours from productConfiguration or template
      const laborHours = {
        engineering: quote.productConfiguration?.engineeringHours || currentTemplate?.engineeringHours || 0,
        production: quote.productConfiguration?.productionHours || currentTemplate?.productionHours || 0,
        programming: quote.productConfiguration?.programmingHours || currentTemplate?.programmingHours || 0
      };

      // Calculate labor cost
      const laborCost = (
        (laborHours.engineering || 0) * 60 +
        (laborHours.production || 0) * 35 +
        (laborHours.programming || 0) * 85
      );

      const totalCOGS = materialCost + laborCost;

      // Calculate final price (if margin is set, otherwise use COGS)
      // For now, we'll just set finalPrice to COGS if no margin is configured
      const marginPercent = quote.pricing?.marginPercent || 0;
      const finalPrice = marginPercent > 0 
        ? totalCOGS / (1 - (marginPercent / 100))
        : totalCOGS;

      // --- Update quote object with new data ---
      const updatedQuote = {
        ...quote,
        operationalItems: operationalItems,
        pricing: {
          materialCost: materialCost,
          laborCost: laborCost,
          totalCOGS: totalCOGS,
          finalPrice: finalPrice,
          marginPercent: marginPercent
        },
        validationErrors: validationResult.validationErrors || [],
        // Pipedrive fields (already in schema, ensure they're present)
        pipedrive_deal_id: quote.pipedrive_deal_id || null,
        pipedrive_person_id: quote.pipedrive_person_id || null,
        historical_margin_avg: quote.historical_margin_avg || null
      };

      // Log margin calculation
      if (window.app && window.app.logMarginCalculation) {
        await window.app.logMarginCalculation({
          quoteId: updatedQuote.quoteId || updatedQuote.id,
          materialCost,
          laborCost,
          totalCOGS,
          marginPercent,
          finalPrice
        });
      }

      // Save the updated quote
      await window.quotes.save(updatedQuote);
      
      // Log the successful quote save
      loggingService.logQuoteActivity(
        'save',
        updatedQuote.quoteId || updatedQuote.id,
        updatedQuote.projectName,
        updatedQuote.customer,
        updatedQuote.status || 'draft',
        {
          materialCost,
          laborCost,
          totalCOGS,
          finalPrice,
          marginPercent,
          operationalItemsCount: operationalItems.length
        }
      );

      // Log the margin calculation
      loggingService.logMarginActivity(
        'calculate',
        totalCOGS,
        marginPercent,
        finalPrice,
        {
          quoteId: updatedQuote.quoteId || updatedQuote.id,
          materialCost,
          laborCost,
          projectName: updatedQuote.projectName,
          customer: updatedQuote.customer
        }
      );
      
      // Update local quote state
      setQuote(updatedQuote);
      
      setMessage('Quote saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      setMessage('Failed to save quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Undo/Redo handlers for configuration history
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousConfig = configHistory[newIndex];
      setHistoryIndex(newIndex);
      setProductConfiguration(previousConfig);
      // Update quote with previous configuration
      setQuote(prev => ({
        ...prev,
        productConfiguration: previousConfig
      }));
    }
  }, [historyIndex, configHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < configHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const nextConfig = configHistory[newIndex];
      setHistoryIndex(newIndex);
      setProductConfiguration(nextConfig);
      // Update quote with next configuration
      setQuote(prev => ({
        ...prev,
        productConfiguration: nextConfig
      }));
    }
  }, [historyIndex, configHistory]);

  // Keyboard shortcuts for save, undo, redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving) {
          setIsSaving(true);
          handleSave().finally(() => setIsSaving(false));
        }
      }
      // Ctrl+Z or Cmd+Z - Undo
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Cmd+Shift+Z - Redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, isSaving]);

  const handleLoadQuote = async () => {
    const quoteId = window.prompt('Enter a Quote ID to load');
    if (!quoteId) return;

    const trimmedId = quoteId.trim();
    if (!trimmedId) return;

    setIsLoading(true);
    setMessage('');
    try {
      const loadedQuote = await window.quotes.getById(trimmedId);

      if (!loadedQuote) {
        alert(`Quote "${trimmedId}" was not found.`);
        return;
      }

      const normalizedQuote = {
        ...quote,
        ...loadedQuote,
        projectCodes: {
          ...quote.projectCodes,
          ...(loadedQuote.projectCodes || {})
        },
        controlPanelConfig: {
          ...quote.controlPanelConfig,
          ...(loadedQuote.controlPanelConfig || {})
        },
        productConfiguration: {
          ...quote.productConfiguration,
          ...(loadedQuote.productConfiguration || {})
        },
        bom: loadedQuote.bom || []
      };

      const bomList = normalizedQuote.bom || [];

      setQuote(normalizedQuote);
      setGeneratedNumber(normalizedQuote.quoteId || '');
      setSelectedAssemblies(bomList.map(item => item.assemblyId).filter(Boolean));
      setAssemblyQuantities(bomList.reduce((acc, item) => {
        if (item.assemblyId) {
          acc[item.assemblyId] = item.quantity || 1;
        }
        return acc;
      }, {}));
      setAssemblyNotes(bomList.reduce((acc, item) => {
        if (item.assemblyId && item.notes) {
          acc[item.assemblyId] = item.notes;
        }
        return acc;
      }, {}));
      setOperationalItems(loadedQuote.operationalItems || []);
      setCurrentStep(1);
      setMessage('Quote loaded successfully!');
    } catch (error) {
      console.error('Load failed:', error);
      alert('Failed to load quote. Please verify the ID and try again.');
      setMessage('Failed to load quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const leftDrawerStyles = isDesktop
    ? {
        top: LEFT_DRAWER_OFFSETS.top,
        left: LEFT_DRAWER_OFFSETS.left,
        bottom: LEFT_DRAWER_OFFSETS.bottomGap,
        width: isLeftDrawerOpen ? `${LEFT_DRAWER_WIDTH}px` : `${LEFT_DRAWER_HANDLE_WIDTH}px`,
        transition: 'width 0.3s ease'
      }
    : {
        top: 0,
        left: 0,
        bottom: 0,
        width: 'min(22rem, calc(100vw - 24px))',
        transform: isLeftDrawerOpen ? 'translateX(0)' : 'translateX(-100%)'
      };

  const rightDrawerStyles = isDesktop
    ? {
        top: RIGHT_DRAWER_OFFSETS.top,
        right: RIGHT_DRAWER_OFFSETS.right,
        bottom: RIGHT_DRAWER_OFFSETS.bottomGap,
        width: isRightDrawerOpen ? `${RIGHT_DRAWER_WIDTH}px` : `${RIGHT_DRAWER_HANDLE_WIDTH}px`,
        transition: 'width 0.3s ease',
        pointerEvents: 'auto'
      }
    : {
        top: 0,
        right: 0,
        bottom: 0,
        width: `min(${RIGHT_DRAWER_WIDTH}px, calc(100vw - 24px))`,
        transform: isRightDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
        pointerEvents: isRightDrawerOpen ? 'auto' : 'none'
      };

  const mainContentStyle = useMemo(() => {
    if (isDesktop) {
      return {
        paddingLeft: LEFT_DRAWER_HANDLE_WIDTH + 8,
        paddingRight: 24
      };
    }

    return {
      paddingLeft: 16,
      paddingRight: 16
    };
  }, [isDesktop]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {!isDesktop && (
        <div
          className={cn(
            'fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
            isLeftDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={() => setIsLeftDrawerOpen(false)}
        />
      )}
      {!isDesktop && (
        <div
          className={cn(
            'fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity duration-300 xl:hidden',
            isRightDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={() => setIsRightDrawerOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed z-20 flex flex-col overflow-hidden border border-border bg-secondary/95 shadow-2xl transition-transform duration-300'
        )}
        style={leftDrawerStyles}
        aria-hidden={!isLeftDrawerOpen && isDesktop}
      >
        {isDesktop && (
          <button
            type="button"
            onClick={() => setIsLeftDrawerOpen(prev => !prev)}
            className={cn(
              'absolute inset-y-0 right-0 flex items-center justify-center border-l border-border bg-secondary/95 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              isLeftDrawerOpen ? 'border-border' : 'border-border'
            )}
            style={{ width: `${LEFT_DRAWER_HANDLE_WIDTH}px` }}
            aria-label={isLeftDrawerOpen ? 'Collapse quote editor drawer' : 'Expand quote editor drawer'}
          >
            {isLeftDrawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        )}
        <div
          className="flex flex-col h-full"
          style={isDesktop ? { paddingRight: isLeftDrawerOpen ? `${LEFT_DRAWER_HANDLE_WIDTH}px` : '0px' } : undefined}
        >
          {(!isDesktop || isLeftDrawerOpen) && (
            <IOLibraryDrawer
              isOpen={isLeftDrawerOpen}
              onClose={() => setIsLeftDrawerOpen(false)}
              onAddToAssembly={(ioItem) => {
                if (!activeAssembly) {
                  console.warn('No active assembly selected for quick-add');
                  return;
                }
                
                const { assemblyId, instanceId } = activeAssembly;
                const instanceList = Array.isArray(productConfiguration[assemblyId]) ? productConfiguration[assemblyId] : [];
                const instanceIndex = instanceList.findIndex(inst => inst.instanceId === instanceId);
                
                if (instanceIndex === -1) {
                  console.error('Active assembly instance not found');
                  return;
                }
                
                const instance = instanceList[instanceIndex];
                const assembly = assemblyDefinitionMap.get(assemblyId);
                
                if (!assembly) {
                  console.error('Assembly definition not found');
                  return;
                }
                
                // Ensure ioSelections exists
                if (!instance.ioSelections) {
                  instance.ioSelections = ensureIoSelections(instance, assembly, defaultIOFields);
                }
                
                // Add the I/O field to the appropriate category
                const category = ioItem.category || 'digitalInputs';
                if (!instance.ioSelections[category]) {
                  instance.ioSelections[category] = [];
                }
                
                // Create new field from ioItem
                const newField = {
                  fieldName: ioItem.fieldName || ioItem.label || 'New Field',
                  description: ioItem.description || '',
                  defaultValue: ioItem.defaultValue || '',
                  unit: ioItem.unit || '',
                  type: ioItem.type || 'text'
                };
                
                // Add to category
                instance.ioSelections[category].push(newField);
                
                // Update configuration
                const updatedInstanceList = [...instanceList];
                updatedInstanceList[instanceIndex] = { ...instance };
                
                updateProductConfiguration({
                  ...productConfiguration,
                  [assemblyId]: updatedInstanceList
                });
                
                console.log(`Added ${newField.fieldName} to ${category}`);
              }}
              defaultIOFields={defaultIOFields}
            />
          )}
        </div>
      </aside>

      <aside
        className={cn(
          'fixed z-20 flex flex-col overflow-hidden border border-border bg-secondary/95 shadow-2xl transition-transform duration-300'
        )}
        style={rightDrawerStyles}
        aria-hidden={!isRightDrawerOpen && isDesktop}
      >
        {isDesktop && (
          <button
            type="button"
            onClick={() => setIsRightDrawerOpen(prev => !prev)}
            className={cn(
              'absolute inset-y-0 left-0 flex items-center justify-center border-r border-border bg-secondary/95 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              isRightDrawerOpen ? 'border-border' : 'border-border'
            )}
            style={{ width: `${RIGHT_DRAWER_HANDLE_WIDTH}px` }}
            aria-label={isRightDrawerOpen ? 'Collapse summary drawer' : 'Expand summary drawer'}
          >
            {isRightDrawerOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        )}
        <div
          className="flex flex-col h-full"
          style={isDesktop ? { paddingLeft: isRightDrawerOpen ? `${RIGHT_DRAWER_HANDLE_WIDTH}px` : '0px' } : undefined}
        >
          {(!isDesktop || isRightDrawerOpen) && (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-blue-200 uppercase">Live BOM</p>
                  <p className="mt-1 text-xs text-muted-foreground">Real-time bill of materials with totals</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(false)}
                  className="inline-flex items-center justify-center border rounded-lg h-9 w-9 border-border bg-secondary text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  aria-label="Close BOM drawer"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="px-4 py-4 space-y-3">
                  {operationalItems.length === 0 ? (
                    <div className="px-4 py-8 text-center border rounded-lg border-border bg-secondary">
                      <p className="text-sm text-muted-foreground">No BOM items yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Complete configuration steps to generate BOM</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {operationalItems.map((item, index) => (
                          <div
                            key={`${item.sku}-${index}`}
                            className="p-3 space-y-2 border rounded-lg border-border bg-card hover:border-border/80"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-xs text-blue-300 truncate">{item.sku}</p>
                                <p className="mt-1 text-sm font-medium leading-tight text-foreground line-clamp-2">
                                  {item.displayName || item.description}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-muted-foreground">Qty: {item.quantity}</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                  ${(item.totalPrice || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {item.sectionGroup && (
                              <div className="flex items-center gap-2">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-secondary text-muted-foreground">
                                  {item.sectionGroup}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="sticky bottom-0 pt-3 mt-3 border-t border-border bg-background/95">
                        <div className="p-4 border rounded-lg border-border bg-secondary">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-muted-foreground">Total Items:</span>
                            <span className="text-sm font-semibold text-foreground">{operationalItems.length}</span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-muted-foreground">Total Qty:</span>
                            <span className="text-sm font-semibold text-foreground">
                              {operationalItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                            </span>
                          </div>
                          <div className="pt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-semibold text-blue-200">Material Cost:</span>
                              <span className="text-lg font-bold text-foreground">
                                ${operationalItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

        <div className="relative flex flex-col flex-1 min-h-screen">
          <main className="flex-1 overflow-x-hidden overflow-y-auto no-scrollbar">
            <div className="w-full py-6 space-y-6" style={mainContentStyle}>
              {message && (
                <div
                  className={cn(
                    'rounded-2xl border px-4 py-4 text-sm shadow-lg',
                    message.toLowerCase().includes('success')
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  )}
                >
                  {message}
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-[minmax(255px,295px)_minmax(0,1fr)_minmax(240px,300px)]">
                <aside className="space-y-6">
                  <ProjectDetails
                    quote={quote}
                    setQuote={setQuote}
                    schemas={schemas}
                    customers={customers}
                    generatedNumber={generatedNumber}
                    setGeneratedNumber={setGeneratedNumber}
                    panelOptions={panelOptions}
                    onToggleLeftDrawer={() => setIsLeftDrawerOpen(prev => !prev)}
                    onToggleRightDrawer={() => setIsRightDrawerOpen(prev => !prev)}
                    isLeftDrawerOpen={isLeftDrawerOpen}
                    isRightDrawerOpen={isRightDrawerOpen}
                  />
                </aside>

                <section className="space-y-6">
                  <div className="border shadow-xl rounded-2xl border-border bg-card shadow-background/40">
                    <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 border-b border-border">
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                          Current Step
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold text-foreground">{activeStep.title}</h2>
                        {activeStep.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{activeStep.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                        <button
                          type="button"
                          onClick={handlePrev}
                          disabled={currentStep === 1 || isLoading}
                          className="gap-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={isLoading}
                          className="gap-2 font-semibold text-foreground hover:text-foreground disabled:opacity-60"
                        >
                          {nextLabel}
                        </button>
                        <span className="hidden w-px h-5 bg-border md:inline-block" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={handleLoadQuote}
                          className="gap-2 text-muted-foreground hover:text-foreground"
                        >
                          Load Quote
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isLoading}
                          className="gap-2 font-semibold text-foreground hover:text-foreground disabled:opacity-70"
                        >
                          {isLoading ? 'Saving…' : 'Save Quote'}
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-6">
                      {stepContent || (
                        <p className="text-sm text-muted-foreground">
                          Select a step to begin configuring the quote.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <SummaryPanel
                    quote={quote}
                    schemas={schemas}
                    customers={customers}
                    generatedNumber={generatedNumber}
                    operationalItems={operationalItems}
                    className="gap-5"
                  />
                </aside>
              </div>
            </div>
          </main>
        </div>
    </div>
  );
}
