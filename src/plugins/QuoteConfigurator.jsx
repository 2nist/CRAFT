import React, { useState, useEffect, useMemo, useCallback } from 'react';

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
      <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">{label}</label>
      <select
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-slate-800 bg-slate-900/80 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
        <option value="" disabled>Select...</option>
        {renderOptions(options)}
      </select>
    </div>
  );
};

const SelectCustomer = ({ label, value, onFieldChange, customers }) => {
  return (
    <div className="w-full">
      <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">{label}</label>
      <select
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-slate-800 bg-slate-900/80 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        value={value || ""}
        onChange={e => {
          const custId = e.target.value;
          const cust = customers.find(c => c.id === custId);
          onFieldChange("customer", custId);
          onFieldChange("projectName", (prev) => prev || `${cust.name} - New Project`);
        }}
      >
        <option value="" disabled>Select customer...</option>
        {customers.map(customer => (
          <option key={customer.id} value={customer.id}>
            {customer.name} ({customer.id})
          </option>
        ))}
      </select>
    </div>
  );
};

const Input = ({ label, value, onFieldChange, fieldName, type = "text", placeholder = "" }) => {
  return (
    <div className="w-full">
      <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-slate-800 bg-slate-900/80 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, e.target.value)}
      />
    </div>
  );
};

const Select = ({ label, value, onFieldChange, fieldName, children }) => {
  return (
    <div className="w-full">
      <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">{label}</label>
      <select
        className="w-full px-3 py-2 text-sm transition border rounded-xl border-slate-800 bg-slate-900/80 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, e.target.value)}
      >
        {children}
      </select>
    </div>
  );
};

// Step 1: Project Details
function ProjectDetails({ quote, setQuote, schemas, customers, generatedNumber, setGeneratedNumber }) {
  
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

  const generateQuoteId = async () => {
    const data = {
      customerCode: quote.customer,
      ...quote.projectCodes
    };
    
    const result = await window.calc.getQuoteNumber(data);
    setGeneratedNumber(result.fullId);
    setQuote(prev => ({ ...prev, quoteId: result.fullId }));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border shadow rounded-2xl border-slate-800 bg-slate-900/60">
        <h3 className="mb-4 text-lg font-semibold text-white">Core Project Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectCustomer
            label="Customer"
            value={quote.customer}
            onFieldChange={handleFieldChange}
            customers={customers}
          />
          <Input
            label="Project Name"
            fieldName="projectName"
            value={quote.projectName}
            onFieldChange={handleFieldChange}
            placeholder="E.g., Brewhouse Expansion"
          />
          <Input
            label="Sales Rep"
            fieldName="salesRep"
            value={quote.salesRep}
            onFieldChange={handleFieldChange}
            placeholder="Your name"
          />
          <Select label="Status" fieldName="status" value={quote.status} onFieldChange={handleFieldChange}>
            <option value="Draft">Draft</option>
            <option value="Quoted">Quoted</option>
            <option value="Approved">Approved</option>
            <option value="Lost">Lost</option>
          </Select>
        </div>
      </div>
      
      <div className="p-6 border shadow rounded-2xl border-slate-800 bg-slate-900/60">
        <h3 className="mb-4 text-lg font-semibold text-white">Project Codes</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SelectCode
            label="Industry"
            fieldName="industry"
            value={quote.projectCodes.industry}
            onFieldChange={handleCodeChange}
            options={schemas.industry}
          />
          <SelectCode
            label="Product"
            fieldName="product"
            value={quote.projectCodes.product}
            onFieldChange={handleCodeChange}
            options={schemas.product}
          />
          <SelectCode
            label="Control"
            fieldName="control"
            value={quote.projectCodes.control}
            onFieldChange={handleCodeChange}
            options={schemas.control}
          />
          <SelectCode
            label="Scope"
            fieldName="scope"
            value={quote.projectCodes.scope}
            onFieldChange={handleCodeChange}
            options={schemas.scope}
          />
        </div>
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={generateQuoteId}
            disabled={!quote.customer}
            className="gap-2"
          >
            Generate Quote Number
          </button>
          {generatedNumber && (
            <div className="px-3 py-2 border rounded-xl border-emerald-500/30 bg-emerald-500/10">
              <span className="font-mono text-lg text-emerald-300">{generatedNumber}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 2: Panel Configuration
function PanelConfig({ quote, setQuote, panelOptions }) {
  const handleFieldChange = (field, value) => {
    setQuote(prev => ({
      ...prev,
      controlPanelConfig: {
        ...prev.controlPanelConfig,
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border shadow rounded-2xl border-slate-800 bg-slate-900/60">
        <h3 className="mb-4 text-lg font-semibold text-white">Panel Specifications</h3>
        <p className="mb-6 text-sm text-slate-400">Configure the control panel for this project</p>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Voltage */}
          <Select 
            label="Voltage" 
            fieldName="voltage" 
            value={quote.controlPanelConfig.voltage} 
            onFieldChange={handleFieldChange}
          >
            <option value="">Select voltage...</option>
            {panelOptions.voltage.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* Phase */}
          <Select 
            label="Phase" 
            fieldName="phase" 
            value={quote.controlPanelConfig.phase} 
            onFieldChange={handleFieldChange}
          >
            <option value="">Select phase...</option>
            {panelOptions.phase.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* Enclosure Type */}
          <Select 
            label="Enclosure Type" 
            fieldName="enclosureType" 
            value={quote.controlPanelConfig.enclosureType} 
            onFieldChange={handleFieldChange}
          >
            <option value="">Select enclosure type...</option>
            {panelOptions.enclosureType.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* Enclosure Rating */}
          <Select 
            label="Enclosure Rating" 
            fieldName="enclosureRating" 
            value={quote.controlPanelConfig.enclosureRating} 
            onFieldChange={handleFieldChange}
          >
            <option value="">Select rating...</option>
            {panelOptions.enclosureRating.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* HMI Size */}
          <Select 
            label="HMI Size" 
            fieldName="hmiSize" 
            value={quote.controlPanelConfig.hmiSize} 
            onFieldChange={handleFieldChange}
          >
            <option value="">Select HMI size...</option>
            {panelOptions.hmiSize.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* PLC Platform */}
          <Select 
            label="PLC Platform" 
            fieldName="plcPlatform" 
            value={quote.controlPanelConfig.plcPlatform} 
            onFieldChange={handleFieldChange}
          >
            <option value="">Select PLC platform...</option>
            {panelOptions.plcPlatform.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

// Step 3: Product Configuration Form (Dynamic Form Renderer)
function ProductConfigurationForm({ currentTemplate, productConfiguration, setProductConfiguration, defaultIOFields }) {
  // CRITICAL DEBUG: Log when component loads
  console.log('🚀 ProductConfigurationForm LOADED!', { 
    timestamp: new Date().toISOString(),
    hasTemplate: !!currentTemplate,
    templateCode: currentTemplate?.productCode,
    productConfig: productConfiguration
  });

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
  
  // Initialize assembly instances when template or custom assemblies change
  React.useEffect(() => {
    if (assembliesToRender.length === 0) {
      return;
    }

    setProductConfiguration(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      assembliesToRender.forEach(assembly => {
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
  }, [assembliesToRender, defaultIOFields, setProductConfiguration]);

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

  // Render a single field based on its type
  const renderField = (field) => {
    const value = productConfiguration[field.fieldName] || '';

    switch (field.fieldType) {
      case 'List':
        return (
          <select
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
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
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
          />
        );

      case 'Text':
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            placeholder={field.defaultValue || ''}
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
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
            <span className="text-sm text-gray-300">Enabled</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleFieldChange(field.fieldName, e.target.value)}
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
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
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
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
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
          />
        );

      case 'Text':
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.value)}
            placeholder={field.defaultValue || ''}
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
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
            <span className="text-sm text-gray-300">Enabled</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleAssemblyFieldChange(assemblyId, instanceId, field.fieldName, e.target.value)}
            className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
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
      const palette = sectionStyles[sectionKey] || { border: 'border-slate-700', chip: 'bg-slate-700/40 text-slate-200' };

      return (
        <div
          key={uniqueKey}
          className={`p-5 space-y-4 rounded-xl border ${palette.border} bg-slate-950/70 shadow-inner`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-white">{sectionTitle}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${palette.chip}`}>
                {fields.length} {fields.length === 1 ? 'point' : 'points'}
              </span>
            </div>
            <span className="text-xs font-medium tracking-wide uppercase text-slate-500">
              I/O Definition
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className="p-4 space-y-3 border rounded-lg border-slate-800/60 bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{field.fieldName}</p>
                    {field.description && (
                      <p className="mt-1 text-xs text-slate-400">{field.description}</p>
                    )}
                  </div>
                  {field.defaultValue !== undefined && field.defaultValue !== '' && (
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Default: {field.defaultValue}
                    </span>
                  )}
                </div>
                {fieldHandler(field)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Regular section rendering for non-I/O fields
    const containerClass = (assemblyId && instanceId) ? "p-4 bg-gray-700 rounded-lg" : "p-4 mb-6 bg-gray-800 rounded-lg shadow";
    const uniqueKey = (assemblyId && instanceId) ? `${assemblyId}-${instanceId}-${sectionKey}` : (assemblyId ? `${assemblyId}-${sectionKey}` : sectionKey);
    return (
      <div key={uniqueKey} className={containerClass}>
        <h3 className="mb-4 text-lg font-semibold text-white">{sectionTitle}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field, idx) => (
            <div key={idx} className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
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
        <p className="text-gray-400">Please select a product in Step 1 to configure.</p>
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
          <h3 className="text-lg font-semibold text-white">Assembly Configuration</h3>
          <p className="text-sm text-slate-400">Add saved assemblies or create custom process cards when templates are missing.</p>
        </div>
        <button onClick={handleOpenAddAssemblyDialog} className="gap-2 text-slate-100">
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
                className="px-3 py-1 text-xs font-semibold tracking-wide border rounded-full text-slate-200 border-slate-700 bg-slate-900/70"
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
                    <h2 className="text-xl font-semibold text-white">{assembly.displayName || assemblyId}</h2>
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
                    <p className="text-sm text-slate-400">{assembly.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {assembly.allowMultiple !== false && (
                    <button onClick={() => handleAddAssemblyInstance(assemblyId)} className="gap-2 text-slate-100">
                      + Add Instance
                    </button>
                  )}
                  {isCustomAssembly && (
                    <button
                      onClick={() => handleRemoveCustomAssemblyDefinition(assemblyId)}
                      className="text-red-300"
                    >
                      Remove Assembly
                    </button>
                  )}
                </div>
              </div>

              {instances.length === 0 ? (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                  <p className="text-sm text-center text-gray-400">
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

                  return (
                    <div key={instanceId} className="p-4 border rounded-2xl border-slate-800 bg-slate-900/70">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-10 h-10 text-lg font-bold text-white bg-blue-600 rounded-full">
                              {instanceIndex + 1}
                            </span>
                            <div>
                              <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Assembly Instance</p>
                              <h3 className="text-lg font-semibold text-white">{assembly.displayName || assemblyId}</h3>
                            </div>
                          </div>
                          <div className="pt-2">
                            <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">
                              Instance Name
                            </label>
                            <input
                              type="text"
                              value={instance.instanceLabel ?? ''}
                              onChange={e => handleInstanceLabelChange(assemblyId, instanceId, e.target.value)}
                              placeholder={instanceLabel}
                              className="w-full px-3 py-2 text-sm text-white border rounded-md bg-slate-950 border-slate-700 focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {assembly.allowMultiple !== false && instances.length > 1 && (
                            <button
                              onClick={() => handleRemoveAssemblyInstance(assemblyId, instanceId)}
                              className="text-sm text-red-300 hover:text-red-200"
                            >
                              Remove
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenInstanceModal(assemblyId, instanceId)}
                            className="px-3 py-2 text-sm font-medium text-white border rounded-md border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20"
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
                                className="px-3 py-1 text-xs font-semibold border rounded-full border-slate-700 bg-slate-950/70 text-slate-200"
                              >
                                {section.label}: {section.active}
                                {section.total > 0 ? ` / ${section.total}` : ''}
                              </span>
                            ))}
                            {nonIoCount > 0 && (
                              <span className="px-3 py-1 text-xs font-semibold border rounded-full border-slate-700 bg-slate-950/70 text-slate-200">
                                Additional Fields: {nonIoCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-center rounded-lg text-slate-400 bg-slate-800/60">
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
          <div className="p-8 text-center bg-gray-800 rounded-lg">
            <p className="text-gray-400">No assemblies configured for this product yet.</p>
            <p className="mt-2 text-sm text-gray-500">Add a saved assembly or build a custom one to begin configuration.</p>
            <button onClick={handleOpenAddAssemblyDialog} className="gap-2 mt-4 text-slate-100">
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
            <div className="w-full max-w-4xl max-h-full p-6 overflow-y-auto border shadow-xl bg-slate-950 border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">Assembly Instance</p>
                  <h3 className="text-xl font-semibold text-white">{assembly.displayName || assemblyId}</h3>
                  <p className="mt-1 text-sm text-slate-400">{modalInstanceLabel}</p>
                </div>
                <button onClick={handleCloseInstanceModal} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="mt-4">
                <label className="block mb-2 text-xs font-semibold tracking-wide uppercase text-slate-400">Instance Name</label>
                <input
                  type="text"
                  value={instance.instanceLabel ?? ''}
                  onChange={e => handleInstanceLabelChange(assemblyId, instanceId, e.target.value)}
                  placeholder={modalInstanceLabel}
                  className="w-full px-3 py-2 text-sm text-white border rounded-md bg-slate-900 border-slate-700 focus:border-blue-500 focus:outline-none"
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
                  <div className="px-4 py-3 text-sm text-center rounded-lg text-slate-400 bg-slate-800/60">
                    No configuration inputs defined for this assembly.
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={handleCloseInstanceModal} className="px-4 py-2 text-sm font-medium text-white border rounded-md border-slate-600 bg-slate-800 hover:bg-slate-700">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isAddAssemblyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-4xl p-6 border shadow-xl bg-slate-950 border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Assembly</h3>
                <p className="text-sm text-slate-400">Select a saved assembly or craft a custom process card.</p>
              </div>
              <button onClick={handleCloseAddAssemblyDialog} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setAssemblyDialogTab('library')}
                className={`px-3 py-1 text-sm rounded-md ${assemblyDialogTab === 'library' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Saved Assemblies
              </button>
              <button
                onClick={() => setAssemblyDialogTab('custom')}
                className={`px-3 py-1 text-sm rounded-md ${assemblyDialogTab === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
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
                  className="w-full px-3 py-2 text-sm text-white border rounded-md bg-slate-900 border-slate-700 focus:border-blue-500 focus:outline-none"
                />
                <div className="space-y-2 overflow-y-auto max-h-80">
                  {assemblyLibraryLoading ? (
                    <p className="py-6 text-center text-slate-400">Loading saved assemblies…</p>
                  ) : filteredAssemblyLibrary.length === 0 ? (
                    <p className="py-6 text-center text-slate-400">No saved assemblies found.</p>
                  ) : (
                    filteredAssemblyLibrary.map(entry => (
                      <div
                        key={entry.subAssemblyId || entry.assemblyId}
                        className="flex items-center justify-between p-3 border rounded-lg bg-slate-900 border-slate-800 hover:border-blue-600"
                      >
                        <div className="min-w-0 mr-3">
                          <p className="font-medium text-white truncate">{entry.description || entry.subAssemblyId || entry.assemblyId}</p>
                          <p className="text-xs truncate text-slate-400">{entry.category || 'Uncategorized'}</p>
                        </div>
                        <button onClick={() => handleSelectSavedAssembly(entry)} className="text-sm text-slate-100">
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
                  <label className="block mb-1 text-xs font-semibold tracking-wide uppercase text-slate-400">Assembly Name</label>
                  <input
                    type="text"
                    value={customAssemblyName}
                    onChange={e => setCustomAssemblyName(e.target.value)}
                    placeholder="e.g., Brewhouse Custom Module"
                    className="w-full px-3 py-2 text-sm text-white border rounded-md bg-slate-900 border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold tracking-wide uppercase text-slate-400">Description (optional)</label>
                  <textarea
                    value={customAssemblyDescription}
                    onChange={e => setCustomAssemblyDescription(e.target.value)}
                    rows={3}
                    placeholder="Add context for this assembly…"
                    className="w-full px-3 py-2 text-sm text-white border rounded-md bg-slate-900 border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={customAllowMultiple}
                    onChange={e => setCustomAllowMultiple(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-600 focus:ring-blue-500"
                  />
                  Allow multiple instances
                </label>
                <div className="flex justify-end">
                  <button onClick={handleCreateCustomAssembly} className="gap-2 text-slate-100">
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

    await window.app.writeFile(`OUTPUT/${filename}`, csvRows.join('\n'));

    return { filename, itemCount: items.length };
  };

  const handleExportBOM = async () => {
    // Use operationalItems if available, otherwise fall back to assemblies
    if (operationalItems && operationalItems.length > 0) {
      try {
        const { filename, itemCount } = await exportOperationalItemsCsv(operationalItems);
        alert(`BOM exported successfully to OUTPUT/${filename}\n\nExported ${itemCount} operational items.`);
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

      await window.app.writeFile(`OUTPUT/${filename}`, csvContent);

        alert(`BOM exported successfully to OUTPUT/${filename}\n\nNote: Using assembly-based export. Generate BOM for consolidated operational items.`);
    } catch (error) {
      console.error('Error exporting BOM:', error);
      alert(`Failed to export BOM: ${error.message}`);
      }
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
              exportMessage = `\n\nSaved automatically to OUTPUT/${filename}.`;
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
      <div className="p-8 text-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">Please select a product in Step 1 to configure assemblies.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">Loading assemblies...</p>
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
      <div className="p-4 bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-white">Assembly Selection & BOM</h3>
            <p className="text-sm text-gray-400">
              Search and add assemblies to build your Bill of Materials
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportBOM}
              disabled={selectedAssemblies.length === 0}
              className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
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
        <div className="p-4 space-y-4 bg-gray-800 rounded-lg shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold text-white">Process Card Overview</h4>
              <p className="mt-1 text-sm text-gray-400">
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
                <div key={assembly.assemblyId || assemblyIdx} className="p-4 border rounded-lg border-slate-700 bg-slate-900/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="text-base font-semibold text-white">{assembly.displayName || assembly.assemblyId}</h5>
                      <p className="text-xs text-gray-400">{assembly.description || 'No description provided.'}</p>
                    </div>
                    {assembly.allowMultiple && (
                      <span className="px-3 py-1 text-xs font-semibold text-blue-200 border rounded-full border-blue-500/40 bg-blue-500/10">
                        Multiple instances allowed
                      </span>
                    )}
                  </div>

                  {instanceList.length === 0 ? (
                    <div className="p-4 mt-3 text-sm text-gray-400 border border-dashed rounded-lg border-slate-700">
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
                          <div key={`${instanceId}-${instanceIndex}`} className="p-3 border rounded-lg border-slate-800 bg-slate-950/70">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white">{instanceDisplayLabel}</span>
                                <span className="text-xs text-gray-500">{instanceId}</span>
                              </div>
                              {instanceRecommendations.some(rec => rec.type === 'recommended' && rec.status === 'pending') && (
                                <span className="px-3 py-1 text-xs font-semibold text-blue-200 border rounded-full border-blue-500/40 bg-blue-500/10">
                                  Pending recommendations
                                </span>
                              )}
                            </div>

                            <div className="grid gap-3 mt-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <span className="block text-xs font-semibold tracking-wide text-gray-400 uppercase">Required Sub-Assemblies</span>
                                <div className="flex flex-wrap gap-2">
                                  {requiredList.length === 0 ? (
                                    <span className="px-3 py-1 text-xs text-gray-500 border rounded-full border-slate-700">
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
                                <span className="block text-xs font-semibold tracking-wide text-gray-400 uppercase">Optional Sub-Assemblies</span>
                                {optionalIds.length === 0 ? (
                                  <span className="px-3 py-1 text-xs text-gray-500 border rounded-full border-slate-700">
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
                                            : 'border-slate-700 text-gray-300 hover:bg-slate-800'
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
          <div className="p-4 border rounded-lg shadow bg-slate-900 border-blue-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold tracking-wide text-blue-200 uppercase">Rule Insights</h4>
                <p className="mt-1 text-xs text-gray-400">Review required inclusions and optional recommendations detected from your configuration.</p>
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
                  <div key={entry.id} className="flex flex-col gap-3 p-3 border rounded-lg bg-slate-950/60 border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{description}</span>
                        <span className="text-xs text-gray-400">{entry.subAssemblyId}</span>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                        {statusChip}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
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
        <div className="p-4 bg-gray-800 rounded-lg shadow">
          <h4 className="mb-4 text-lg font-semibold text-white">Available Sub-Assemblies</h4>
          
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search by Assembly ID, Description, or Category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-3 mb-4 text-white bg-gray-700 border border-gray-600 rounded-md"
          />

          {/* Sort Options */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">Sort by:</span>
            <button
              onClick={() => setSortBy('description')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                sortBy === 'description'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setSortBy('category')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                sortBy === 'category'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Category
            </button>
          </div>

          {/* Assembly List */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {filteredAvailableAssemblies.length === 0 ? (
              <p className="py-8 text-center text-gray-400">
                {searchTerm ? 'No assemblies match your search.' : 'No assemblies available.'}
              </p>
            ) : (
              filteredAvailableAssemblies.map(assembly => (
                <div key={assembly.assemblyId} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{assembly.description}</p>
                      <span className="px-2 py-0.5 text-xs font-medium text-blue-300 bg-blue-900/50 border border-blue-700 rounded-full whitespace-nowrap">
                        {assembly.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 truncate">{assembly.assemblyId}</p>
                  </div>
                  <button
                    onClick={() => handleAddAssembly(assembly.assemblyId)}
                    className="px-3 py-1 ml-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Assemblies (BOM) */}
        <div className="p-4 bg-gray-800 rounded-lg shadow">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Bill of Materials ({selectedAssemblyObjects.length} types, {selectedAssemblies.length} total)
          </h3>
          
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {selectedAssemblyObjects.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-400">No assemblies selected yet.</p>
                <p className="mt-2 text-sm text-gray-500">Search and add assemblies from the left</p>
              </div>
            ) : (
              selectedAssemblyObjects.map(assembly => {
                const isRequired = currentTemplate.assemblies?.required?.includes(assembly.assemblyId);
                
                return (
                  <div key={assembly.assemblyId} className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{assembly.description}</p>
                          <span className="px-2 py-0.5 text-xs font-medium text-blue-300 bg-blue-900/50 border border-blue-700 rounded-full">
                            {assembly.category}
                          </span>
                          {isRequired && (
                            <span className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{assembly.assemblyId}</p>
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
                        <label className="block mb-1 text-sm text-gray-400">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={assemblyQuantities[assembly.assemblyId] || 1}
                          onChange={e => handleQuantityChange(assembly.assemblyId, e.target.value)}
                          className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
                        />
                      </div>

                      {/* Notes Input */}
                      <div>
                        <label className="block mb-1 text-sm text-gray-400">Notes</label>
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={assemblyNotes[assembly.assemblyId] || ''}
                          onChange={e => handleNoteChange(assembly.assemblyId, e.target.value)}
                          className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
                        />
                      </div>
                    </div>

                    {/* Components List Toggle */}
                    <div className="mt-3">
                      <button
                        onClick={() => toggleAssemblyExpansion(assembly.assemblyId)}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <span>{expandedAssemblies[assembly.assemblyId] ? '▼' : '▶'}</span>
                        <span>
                          {expandedAssemblies[assembly.assemblyId] ? 'Hide' : 'Show'} Components 
                          ({assembly.components?.length || 0})
                        </span>
                      </button>

                      {expandedAssemblies[assembly.assemblyId] && assembly.components && assembly.components.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-semibold text-gray-400 border-b border-gray-600">
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
                                className="grid grid-cols-12 gap-2 px-2 py-2 text-xs text-gray-300 bg-gray-800 rounded"
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
      <div className="p-4 mt-6 bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Consolidated Bill of Materials
        </h3>
        
        {operationalItems.length === 0 ? (
          <div className="py-8 text-center bg-gray-700 rounded-lg">
            <p className="text-gray-400">No BOM Generated.</p>
            <p className="mt-2 text-sm text-gray-500">Click 'Generate BOM' above to create the consolidated Bill of Materials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">SKU</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Description</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-gray-300">Qty</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-gray-300">Unit Price</th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-gray-300">Total Price</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-300">Section</th>
                </tr>
              </thead>
              <tbody>
                {operationalItems.map((item, index) => (
                  <tr 
                    key={`${item.sku}-${index}`} 
                    className="border-b border-gray-700 hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-blue-300">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div>
                        <div className="font-medium text-white">{item.displayName || item.description}</div>
                        {item.description && item.description !== item.displayName && (
                          <div className="mt-1 text-xs text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">
                      ${(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-white">
                      ${(item.totalPrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      <span className="px-2 py-1 text-xs bg-gray-700 rounded">
                        {item.sectionGroup || 'Other'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-600 bg-gray-700/50">
                  <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-right text-gray-300">
                    Total Material Cost:
                  </td>
                  <td className="px-4 py-3 text-lg font-bold text-right text-white">
                    ${operationalItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="p-6 mt-6 border shadow rounded-2xl border-slate-800 bg-slate-900/60">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Labour Hours</h3>
            <p className="text-sm text-slate-400">
              Adjust the labour allowances for this quote. These values roll into pricing alongside the generated BOM.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-200">Engineering Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentEngineeringHours}
                onChange={e => handleLabourFieldChange('engineeringHours', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-white transition border rounded-lg border-slate-700 bg-slate-900/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <span className="block text-xs text-slate-500">Template baseline: {engineeringDefault.toFixed(1)} hrs</span>
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-200">Programming Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentProgrammingHours}
                onChange={e => handleLabourFieldChange('programmingHours', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-white transition border rounded-lg border-slate-700 bg-slate-900/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-200">Production Hours</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={currentProductionHours}
                onChange={e => handleLabourFieldChange('productionHours', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-white transition border rounded-lg border-slate-700 bg-slate-900/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg border-slate-800 bg-slate-950/70">
            <span className="text-sm font-medium text-slate-300">Total Labour Hours</span>
            <span className="text-xl font-semibold text-white">{totalLabourHours} hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({ quote, schemas, customers, generatedNumber, operationalItems }) {
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
        return 'border border-slate-800 bg-slate-900 text-slate-200';
    }
  })();

  const configStats = [
    { label: 'Motors', value: productConfiguration.motors?.length ?? 0 },
    { label: 'Heaters', value: productConfiguration.heaters?.length ?? 0 },
    { label: 'Inputs', value: productConfiguration.inputs?.length ?? 0 },
    { label: 'Outputs', value: productConfiguration.outputs?.length ?? 0 }
  ];

  return (
    <aside className="flex-col hidden gap-4 xl:flex">
      <div className="p-6 border shadow-sm rounded-2xl border-slate-800 bg-slate-900/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide uppercase text-slate-400">Quote Snapshot</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-100">{quote.projectName || 'Untitled Quote'}</h3>
            <p className="mt-1 text-sm text-slate-400">{customerName}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {normalizedStatus}
          </span>
        </div>

        <dl className="mt-6 space-y-3 text-sm text-slate-300">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Quote #</dt>
            <dd className="font-medium text-slate-100">{quote.quoteId || generatedNumber || 'Not generated'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Sales Rep</dt>
            <dd className="font-medium text-slate-100">{quote.salesRep || 'Unassigned'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Material Cost</dt>
            <dd className="font-medium text-slate-100">{formatCurrency(pricing.materialCost)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Labor Cost</dt>
            <dd className="font-medium text-slate-100">{formatCurrency(pricing.laborCost)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Margin %</dt>
            <dd className="font-medium text-slate-100">{pricing.marginPercent ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs tracking-wide uppercase text-slate-400">Project Codes</p>
          <div className="mt-2 space-y-2 text-sm">
            <div className="p-3 border rounded-xl border-slate-800/70 bg-slate-900/40">
              <p className="text-xs tracking-wide uppercase text-slate-500">Industry</p>
              <p className="mt-1 font-medium text-slate-100">
                {resolveCodeDescription(schemas.industry, projectCodes.industry)}
              </p>
            </div>
            <div className="p-3 border rounded-xl border-slate-800/70 bg-slate-900/40">
              <p className="text-xs tracking-wide uppercase text-slate-500">Product</p>
              <p className="mt-1 font-medium text-slate-100">
                {resolveCodeDescription(schemas.product, projectCodes.product)}
              </p>
            </div>
            <div className="p-3 border rounded-xl border-slate-800/70 bg-slate-900/40">
              <p className="text-xs tracking-wide uppercase text-slate-500">Control</p>
              <p className="mt-1 font-medium text-slate-100">
                {resolveCodeDescription(schemas.control, projectCodes.control)}
              </p>
            </div>
            <div className="p-3 border rounded-xl border-slate-800/70 bg-slate-900/40">
              <p className="text-xs tracking-wide uppercase text-slate-500">Scope</p>
              <p className="mt-1 font-medium text-slate-100">
                {resolveCodeDescription(schemas.scope, projectCodes.scope)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border shadow-sm rounded-2xl border-slate-800 bg-slate-900/60">
        <h3 className="text-sm font-semibold text-slate-200">Configuration Status</h3>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          {configStats.map(stat => (
            <div key={stat.label} className="p-3 border rounded-xl border-slate-800/80 bg-slate-900/40">
              <p className="text-xs tracking-wide uppercase text-slate-500">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{stat.value}</p>
            </div>
          ))}
          <div className="p-3 border rounded-xl border-slate-800/80 bg-slate-900/40">
            <p className="text-xs tracking-wide uppercase text-slate-500">BOM Items</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{bomCount}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm text-slate-300">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Total COGS</span>
            <span className="font-medium text-slate-100">{formatCurrency(pricing.totalCOGS)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">Sell Price</span>
            <span className="font-medium text-slate-100">{formatCurrency(pricing.finalPrice)}</span>
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

  const updateProductConfiguration = useCallback((configOrUpdater) => {
    setQuote(prev => ({
      ...prev,
      productConfiguration: typeof configOrUpdater === 'function'
        ? configOrUpdater(prev.productConfiguration)
        : configOrUpdater
    }));
  }, [setQuote]);

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
    { id: 1, title: 'Project Setup', description: 'Capture the opportunity details and classification codes.' },
    { id: 2, title: 'Panel Config', description: 'Define the control panel architecture and hardware requirements.' },
    { id: 3, title: 'Product Config', description: 'Configure motors, I/O, and assemblies unique to this product.' },
    { id: 4, title: 'BOM Assistance', description: 'Assemble the bill of materials and generate consolidated outputs.' }
  ];

  const activeStep = steps.find(step => step.id === currentStep) || steps[0];
  const nextStep = steps[currentStep] ? steps[currentStep].title : null;
  const nextLabel = currentStep === steps.length
    ? (isLoading ? 'Saving…' : 'Save & Finish')
    : `Continue${nextStep ? ` · ${nextStep}` : ''}`;

  const stepContent = (() => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectDetails
            quote={quote}
            setQuote={setQuote}
            schemas={schemas}
            customers={customers}
            generatedNumber={generatedNumber}
            setGeneratedNumber={setGeneratedNumber}
          />
        );
      case 2:
        return (
          <PanelConfig
            quote={quote}
            setQuote={setQuote}
            panelOptions={panelOptions}
          />
        );
      case 3:
        return (
          <ProductConfigurationForm
            currentTemplate={currentTemplate}
            productConfiguration={quote.productConfiguration}
            setProductConfiguration={updateProductConfiguration}
            defaultIOFields={defaultIOFields}
          />
        );
      case 4:
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

      // Save the updated quote
      await window.quotes.save(updatedQuote);
      
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/70 backdrop-blur">
        <div className="px-6 py-6 mx-auto max-w-7xl">
          <h1 className="text-3xl font-semibold text-white">{quote.projectName || 'Untitled Quote'}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {displayQuoteNumber ? `Quote #${displayQuoteNumber}` : 'Quote number pending'}
          </p>
        </div>
      </header>

      <main className="px-6 py-8 mx-auto max-w-7xl">
        {message && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-4 text-sm ${
              message.toLowerCase().includes('success')
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <section className="space-y-6">
            <div className="border shadow-xl rounded-2xl border-slate-800 bg-slate-900/60 shadow-slate-950/40">
              <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5 border-b border-slate-800/70">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-100">{activeStep.title}</h2>
                  {activeStep.description && (
                    <p className="mt-2 text-sm text-slate-400">
                      {activeStep.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStep === 1 || isLoading}
                    className="gap-2 text-slate-300 hover:text-white disabled:opacity-40"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="gap-2 font-semibold text-slate-100 hover:text-white disabled:opacity-60"
                  >
                    {nextLabel}
                  </button>
                  <span className="hidden w-px h-5 mx-2 bg-slate-800 md:inline-block" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={handleLoadQuote}
                    className="gap-2 text-slate-300 hover:text-white"
                  >
                    Load Quote
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="gap-2 font-semibold text-slate-100 hover:text-white disabled:opacity-70"
                  >
                    {isLoading ? 'Saving…' : 'Save Quote'}
                  </button>
                </div>
              </div>
              <div className="px-6 py-6">
                {stepContent || (
                  <p className="text-sm text-slate-400">
                    Select a step to begin configuring the quote.
                  </p>
                )}
              </div>
            </div>
          </section>

          <SummaryPanel
            quote={quote}
            schemas={schemas}
            customers={customers}
            generatedNumber={generatedNumber}
            operationalItems={operationalItems}
          />
        </div>
      </main>
    </div>
  );
}
