import React, { useState, useEffect, useMemo } from 'react';

// Helper Components
const SelectCode = ({ label, value, onFieldChange, options, fieldName }) => {
  const renderOptions = (opts) => opts.map(option => (
    <option key={option.const} value={option.const}>
      {option.description} ({option.const})
    </option>
  ));

  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-medium text-gray-400">{label}</label>
      <select
        className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded-md"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, parseInt(e.target.value))}
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
      <label className="block mb-2 text-sm font-medium text-gray-400">{label}</label>
      <select
        className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded-md"
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
      <label className="block mb-2 text-sm font-medium text-gray-400">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded-md"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, e.target.value)}
      />
    </div>
  );
};

const Select = ({ label, value, onFieldChange, fieldName, children }) => {
  return (
    <div className="w-full">
      <label className="block mb-2 text-sm font-medium text-gray-400">{label}</label>
      <select
        className="w-full p-2 text-white bg-gray-700 border border-gray-600 rounded-md"
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
    setGeneratedNumber(result.mainId);
    setQuote(prev => ({ ...prev, quoteId: result.fullId }));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-800 rounded-lg shadow">
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
      
      <div className="p-4 bg-gray-800 rounded-lg shadow">
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
          <button onClick={generateQuoteId} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700" disabled={!quote.customer}>
            Generate Quote Number
          </button>
          {generatedNumber && (
            <div className="p-3 bg-gray-900 rounded-md">
              <span className="font-mono text-lg text-green-400">{generatedNumber}</span>
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
      <div className="p-4 bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold text-white">Panel Specifications</h3>
        <p className="mb-6 text-sm text-gray-400">Configure the control panel for this project</p>
        
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
function ProductConfigurationForm({ currentTemplate, productConfiguration, setProductConfiguration }) {
  const [ioInstances, setIoInstances] = React.useState({
    digitalIn: [],
    analogIn: [],
    digitalOut: [],
    analogOut: []
  });

  // Handle field value changes (for simple fields)
  const handleFieldChange = (fieldName, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle adding an I/O instance
  const handleAddInstance = (ioType, fieldDef) => {
    const instanceId = `${ioType}_${Date.now()}`;
    const newInstance = {
      id: instanceId,
      fieldName: fieldDef.fieldName,
      fieldType: fieldDef.fieldType,
      listOptions: fieldDef.listOptions,
      value: fieldDef.defaultValue || ''
    };

    setIoInstances(prev => ({
      ...prev,
      [ioType]: [...prev[ioType], newInstance]
    }));

    setProductConfiguration(prev => ({
      ...prev,
      [instanceId]: fieldDef.defaultValue || ''
    }));
  };

  // Handle removing an I/O instance
  const handleRemoveInstance = (ioType, instanceId) => {
    setIoInstances(prev => ({
      ...prev,
      [ioType]: prev[ioType].filter(inst => inst.id !== instanceId)
    }));

    setProductConfiguration(prev => {
      const newConfig = { ...prev };
      delete newConfig[instanceId];
      return newConfig;
    });
  };

  // Handle instance value change
  const handleInstanceChange = (instanceId, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [instanceId]: value
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

  // Render I/O section with hybrid approach (counts + detailed instances)
  const renderIOSection = (sectionKey, sectionTitle, fields) => {
    console.log('renderIOSection called:', { sectionKey, sectionTitle, fields, fieldsLength: fields?.length });
    if (!fields || fields.length === 0) {
      console.log('Returning null - no fields for:', sectionKey);
      return null;
    }

    // Check if this is an I/O section
    const isIOSection = ['digitalIn', 'analogIn', 'digitalOut', 'analogOut'].includes(sectionKey);
    console.log('Is IO Section:', sectionKey, isIOSection);
    
    if (isIOSection) {
      // Hybrid I/O rendering: Show count field + detailed instances
      const countField = fields.find(f => f.fieldType === 'Number');
      const detailFields = fields.filter(f => f.fieldType !== 'Number');

      return (
        <div key={sectionKey} className="p-4 mb-6 bg-gray-800 rounded-lg shadow">
          <h3 className="mb-4 text-lg font-semibold text-white">{sectionTitle}</h3>
          
          {/* Count Field */}
          {countField && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                {countField.fieldName}
              </label>
              {renderField(countField)}
            </div>
          )}

          {/* Detailed I/O Configuration */}
          {detailFields.length > 0 && (
            <>
              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-300">Configure Individual {sectionTitle}</h4>
                <div className="flex flex-wrap gap-2">
                  {detailFields.map((field, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddInstance(sectionKey, field)}
                      className="px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      + Add {field.fieldName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display configured instances */}
              {ioInstances[sectionKey].length > 0 && (
                <div className="space-y-2">
                  {ioInstances[sectionKey].map((instance) => (
                    <div key={instance.id} className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <label className="block mb-1 text-xs text-gray-400">{instance.fieldName}</label>
                        {instance.fieldType === 'List' ? (
                          <select
                            value={productConfiguration[instance.id] || ''}
                            onChange={e => handleInstanceChange(instance.id, e.target.value)}
                            className="w-full p-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-md"
                          >
                            <option value="">Select...</option>
                            {instance.listOptions?.map((option, idx) => (
                              <option key={idx} value={option.value || option.name}>
                                {option.label || option.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={instance.fieldType === 'Number' ? 'number' : 'text'}
                            value={productConfiguration[instance.id] || ''}
                            onChange={e => handleInstanceChange(instance.id, e.target.value)}
                            className="w-full p-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-md"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveInstance(sectionKey, instance.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // Regular section rendering for non-I/O fields
    return (
      <div key={sectionKey} className="p-4 mb-6 bg-gray-800 rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold text-white">{sectionTitle}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field, idx) => (
            <div key={idx} className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {field.fieldName}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Show loading state if no template
  if (!currentTemplate) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Please select a product in Step 1 to configure.</p>
      </div>
    );
  }

  // Get available sections from template or use defaults
  const availableSections = currentTemplate.availableSections || ['digitalIn', 'analogIn', 'digitalOut', 'analogOut'];
  
  // Use template fields, but fall back to default I/O fields if template fields are empty
  let fields = currentTemplate.fields || {};
  const hasAnyFields = Object.values(fields).some(arr => arr && arr.length > 0);
  
  if (!hasAnyFields) {
    // Template has no custom fields, use default I/O fields
    fields = defaultIOFields;
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

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-800 rounded-lg shadow">
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-semibold text-white">Product Configuration</h3>
          <p className="text-sm text-gray-400">
            Configure {currentTemplate.productName || 'this product'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Template: {currentTemplate.productCode}
          </p>
        </div>

        {/* Base Labour Hours Section - from template */}
        <div className="p-4 bg-gray-700 rounded-lg">
          <h4 className="mb-4 text-base font-semibold text-white">Base Labour Hours</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Engineering Hours */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Engineering Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={productConfiguration.engineeringHours ?? currentTemplate.engineeringHours ?? 0}
                onChange={e => handleFieldChange('engineeringHours', parseFloat(e.target.value) || 0)}
                placeholder={(currentTemplate.engineeringHours || 0).toFixed(1)}
                className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
              />
              <p className="text-xs text-gray-500">Template default: {(currentTemplate.engineeringHours || 0).toFixed(1)} hrs</p>
            </div>

            {/* Programming Hours */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Programming Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={productConfiguration.programmingHours ?? currentTemplate.programmingHours ?? 0}
                onChange={e => handleFieldChange('programmingHours', parseFloat(e.target.value) || 0)}
                placeholder={(currentTemplate.programmingHours || 0).toFixed(1)}
                className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
              />
              <p className="text-xs text-gray-500">Template default: {(currentTemplate.programmingHours || 0).toFixed(1)} hrs</p>
            </div>

            {/* Production Hours */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Production Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={productConfiguration.productionHours ?? currentTemplate.productionHours ?? 0}
                onChange={e => handleFieldChange('productionHours', parseFloat(e.target.value) || 0)}
                placeholder={(currentTemplate.productionHours || 0).toFixed(1)}
                className="w-full p-2 text-white bg-gray-800 border border-gray-600 rounded-md"
              />
              <p className="text-xs text-gray-500">Template default: {(currentTemplate.productionHours || 0).toFixed(1)} hrs</p>
            </div>
          </div>

          {/* Total Display */}
          <div className="p-3 mt-4 bg-gray-600 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Total Labour Hours:</span>
              <span className="text-lg font-bold text-white">
                {((productConfiguration.engineeringHours ?? currentTemplate.engineeringHours ?? 0) + 
                  (productConfiguration.programmingHours ?? currentTemplate.programmingHours ?? 0) + 
                  (productConfiguration.productionHours ?? currentTemplate.productionHours ?? 0)).toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Render sections dynamically based on availableSections */}
      {console.log('Available sections:', availableSections, 'Fields:', fields)}
      {availableSections.map(sectionKey => {
        const sectionFields = fields[sectionKey];
        const sectionTitle = sectionTitles[sectionKey] || sectionKey;
        console.log('Mapping section:', sectionKey, 'Fields:', sectionFields);
        return renderIOSection(sectionKey, sectionTitle, sectionFields);
      })}

      {/* Show message if no fields are available */}
      {availableSections.every(key => !fields[key] || fields[key].length === 0) && (
        <div className="p-8 text-center bg-gray-800 rounded-lg">
          <p className="text-gray-400">No configuration fields available for this template.</p>
          <p className="mt-2 text-sm text-gray-500">Use the Product Template Manager to add fields.</p>
        </div>
      )}
    </div>
  );
}

// Step 4: Assembly Selection & BOM
function AssemblySelection({ currentTemplate, productConfiguration, selectedAssemblies, setSelectedAssemblies, assemblyQuantities, setAssemblyQuantities, assemblyNotes, setAssemblyNotes }) {
  const [availableAssemblies, setAvailableAssemblies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sortBy, setSortBy] = useState('description'); // 'description' or 'category'
  const [expandedAssemblies, setExpandedAssemblies] = useState({}); // Track which assemblies are expanded to show components

  useEffect(() => {
    const loadAssemblies = async () => {
      if (!currentTemplate) return;
      
      setIsLoading(true);
      try {
        const allAssemblies = await window.assemblies.getAll();
        
        // Expand all assemblies to get full component details
        const expandedAssemblies = await Promise.all(
          allAssemblies.map(async (assembly) => {
            try {
              const expanded = await window.assemblies.expand(assembly.assemblyId);
              return expanded || assembly; // Fallback to original if expand fails
            } catch (err) {
              console.error(`Failed to expand assembly ${assembly.assemblyId}:`, err);
              return assembly;
            }
          })
        );
        
        setAvailableAssemblies(expandedAssemblies);
        
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

  const handleExportBOM = async () => {
    if (selectedAssemblies.length === 0) {
      alert('No assemblies in BOM to export.');
      return;
    }

    try {
      const uniqueIds = [...new Set(selectedAssemblies)];
      
      // Expand assemblies to get full component details
      const expandedAssemblies = await Promise.all(
        uniqueIds.map(id => window.assemblies.expand(id))
      );
      
      const assemblyObjects = expandedAssemblies.filter(Boolean);

      // Build CSV content
      const csvRows = [];
      
      // Header
      csvRows.push('Assembly ID,Assembly Description,Assembly Category,Assembly Qty,Assembly Notes,Component SKU,Component Description,Component Vendor,Component VN#,Component Qty');

      // Data rows
      assemblyObjects.forEach(assembly => {
        const assemblyQty = assemblyQuantities[assembly.assemblyId] || 1;
        const assemblyNote = assemblyNotes[assembly.assemblyId] || '';
        
        if (assembly.components && assembly.components.length > 0) {
          assembly.components.forEach(comp => {
            const component = comp.component; // Expanded component details (can be null)
            const row = [
              assembly.assemblyId,
              `"${assembly.description}"`,
              assembly.category,
              assemblyQty,
              `"${assemblyNote}"`,
              comp.sku,
              component ? `"${component.description}"` : `"${comp.sku}"`, // Use SKU as fallback
              component ? component.vendor : 'Unknown',
              component ? (component.attributes?.vndrnum || component.vndrnum || '') : '',
              comp.quantity || 1
            ];
            csvRows.push(row.join(','));
          });
        } else {
          // Assembly with no components
          const row = [
            assembly.assemblyId,
            `"${assembly.description}"`,
            assembly.category,
            assemblyQty,
            `"${assemblyNote}"`,
            '',
            '',
            '',
            '',
            ''
          ];
          csvRows.push(row.join(','));
        }
      });

      const csvContent = csvRows.join('\n');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `BOM_${timestamp}.csv`;

      // Save to OUTPUT directory
      await window.app.writeFile(`OUTPUT/${filename}`, csvContent);
      
      alert(`BOM exported successfully to OUTPUT/${filename}`);
    } catch (error) {
      console.error('Error exporting BOM:', error);
      alert(`Failed to export BOM: ${error.message}`);
    }
  };

  const handleGenerateBom = async () => {
    if (!currentTemplate || !productConfiguration) {
      console.log('Cannot generate BOM: missing template or configuration');
      return;
    }
    
    setIsGenerating(true);
    try {
      const allFields = [
        ...(currentTemplate.fields?.digitalIn || []),
        ...(currentTemplate.fields?.analogIn || []),
        ...(currentTemplate.fields?.digitalOut || []),
        ...(currentTemplate.fields?.analogOut || [])
      ];
      
      const bomAssemblies = new Set([
        ...(currentTemplate.assemblies?.required || []),
        ...(currentTemplate.assemblies?.recommended || [])
      ]);

      console.log('[Generate BOM] Template assemblies:', {
        required: currentTemplate.assemblies?.required,
        recommended: currentTemplate.assemblies?.recommended,
        bomAssemblies: Array.from(bomAssemblies)
      });

      const searchFilters = [];

      // Loop through each configured field to collect bomLogic
      for (const [fieldName, fieldValue] of Object.entries(productConfiguration)) {
        if (!fieldValue) continue;

        const fieldDef = allFields.find(f => f.fieldName === fieldName);
        if (!fieldDef) continue;

        if (fieldDef.fieldType === 'List' && typeof fieldValue === 'object' && fieldValue.type) {
          const selectedOption = fieldDef.listOptions.find(opt => (opt.value || opt.name) === fieldValue.type);
          if (selectedOption?.bomLogic) {
            searchFilters.push(selectedOption.bomLogic);
          }
        }
        else if (fieldDef.fieldType === 'List' && fieldDef.listOptions) {
          const selectedOption = fieldDef.listOptions.find(opt => (opt.value || opt.name) === fieldValue);
          if (selectedOption?.bomLogic) {
            searchFilters.push(selectedOption.bomLogic);
          }
        }
      }

      if (searchFilters.length > 0) {
        const matchingAssemblyIds = await window.assemblies.searchMany(searchFilters);
        console.log('[Generate BOM] Matched assemblies from bomLogic:', matchingAssemblyIds);
        matchingAssemblyIds.forEach(id => bomAssemblies.add(id));
      }

      // Add new assemblies to existing selection (don't replace)
      const finalAssemblies = Array.from(bomAssemblies);
      const newAssemblies = finalAssemblies.filter(id => !selectedAssemblies.includes(id));
      
      console.log('[Generate BOM] Final assemblies:', finalAssemblies);
      console.log('[Generate BOM] New assemblies to add:', newAssemblies);
      console.log('[Generate BOM] Current selected:', selectedAssemblies);
      
      if (newAssemblies.length > 0) {
        setSelectedAssemblies(prev => [...prev, ...newAssemblies]);
        
        const newQuantities = { ...assemblyQuantities };
        newAssemblies.forEach(id => {
          newQuantities[id] = 1;
        });
        setAssemblyQuantities(newQuantities);
        console.log('[Generate BOM] Added assemblies successfully');
        alert(`Added ${newAssemblies.length} assembly/assemblies to BOM`);
      } else if (finalAssemblies.length === 0 && selectedAssemblies.length === 0) {
        // No assemblies found at all AND no manually added assemblies
        console.log('[Generate BOM] No assemblies to suggest and BOM is empty');
        alert('No assemblies found. This template has no required/recommended assemblies, and no assemblies matched your configuration. Please add assemblies manually.');
      } else if (finalAssemblies.length === 0) {
        // No assemblies found but user has manually added some
        console.log('[Generate BOM] No assemblies to suggest, but BOM has manual additions');
        alert('No additional assemblies to suggest. This template has no configured assemblies. Your manually added assemblies are ready.');
      } else {
        // Found assemblies but they're all already selected
        console.log('[Generate BOM] All suggested assemblies already in BOM');
        alert('All suggested assemblies are already in your BOM.');
      }
      
    } catch (error) {
      console.error('Error generating BOM:', error);
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT COLUMN: Assembly Search */}
        <div className="p-4 bg-gray-800 rounded-lg shadow">
          <h4 className="mb-4 text-lg font-semibold text-white">Available Assemblies</h4>
          
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
    </div>
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
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedNumber, setGeneratedNumber] = useState('');
  const [schemas, setSchemas] = useState({ industry: [], product: [], control: [], scope: [] });
  const [customers, setCustomers] = useState([]);
  const [panelOptions, setPanelOptions] = useState({ voltage: [], phase: [], enclosureType: [], enclosureRating: [], hmiSize: [], plcPlatform: [] });
  const [defaultIOFields, setDefaultIOFields] = useState({ digitalIn: [], analogIn: [], digitalOut: [], analogOut: [] });

  useEffect(() => {
    const loadData = async () => {
      try {
        const industry = await window.schemas.getIndustry();
        const product = await window.schemas.getProduct();
        const control = await window.schemas.getControl();
        const scope = await window.schemas.getScope();
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
          setCurrentTemplate(template);
          
          // Initialize productConfiguration with ALL data from template
          setQuote(prev => ({
            ...prev,
            productConfiguration: {
              ...prev.productConfiguration,
              engineeringHours: template.engineeringHours || 0,
              programmingHours: template.programmingHours || 0,
              productionHours: template.productionHours || 0,
              fields: template.fields || {},
              assemblies: template.assemblies || { required: [], recommended: [], optional: [] },
              notes: template.notes || ''
            }
          }));
        } else {
          // No template found - use default I/O fields
          setCurrentTemplate({
            productCode: productCode,
            productName: 'New Template (Unsaved)',
            fields: defaultIOFields,
            assemblies: {
              required: [],
              recommended: []
            },
            availableSections: ['product', 'control', 'optional'],
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
    { id: 1, title: 'Project Setup' },
    { id: 2, title: 'Panel Config' },
    { id: 3, title: 'Product Config' },
    { id: 4, title: 'BOM Assistance' }
  ];

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
      await window.quotes.save(quote);
      setMessage('Quote saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      setMessage('Failed to save quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 text-white bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Quote Configurator</h1>
          <p className="text-gray-400">Configure quotes for Craft Automation products</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {step.id}
                </div>
                <span className={`ml-2 text-sm ${step.id <= currentStep ? 'text-white' : 'text-gray-400'}`}>
                  {step.title}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    step.id < currentStep ? 'bg-blue-600' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <ProjectDetails 
              quote={quote} 
              setQuote={setQuote} 
              schemas={schemas}
              customers={customers}
              generatedNumber={generatedNumber}
              setGeneratedNumber={setGeneratedNumber}
            />
          )}
          {currentStep === 2 && (
            <PanelConfig 
              quote={quote} 
              setQuote={setQuote} 
              panelOptions={panelOptions}
            />
          )}
          {currentStep === 3 && (
            <ProductConfigurationForm
              currentTemplate={currentTemplate}
              productConfiguration={quote.productConfiguration}
              setProductConfiguration={(configOrUpdater) => {
                setQuote(prev => ({
                  ...prev,
                  productConfiguration: typeof configOrUpdater === 'function' 
                    ? configOrUpdater(prev.productConfiguration) 
                    : configOrUpdater
                }));
              }}
            />
          )}
          {currentStep === 4 && (
            <AssemblySelection
              currentTemplate={currentTemplate}
              productConfiguration={quote.productConfiguration}
              selectedAssemblies={selectedAssemblies}
              setSelectedAssemblies={setSelectedAssemblies}
              assemblyQuantities={assemblyQuantities}
              setAssemblyQuantities={setAssemblyQuantities}
              assemblyNotes={assemblyNotes}
              setAssemblyNotes={setAssemblyNotes}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handlePrev} 
            disabled={currentStep === 1}
            className="px-4 py-2 text-white bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={handleSave} 
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Quote'}
            </button>
          </div>

          <button 
            onClick={handleNext} 
            disabled={false}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === steps.length ? 'Finish' : 'Next'}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            message.includes('success') ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
