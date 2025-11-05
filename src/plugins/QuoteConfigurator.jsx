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
      <label className="block font-medium text-gray-400 mb-2 text-sm">{label}</label>
      <select
        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
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
      <label className="block font-medium text-gray-400 mb-2 text-sm">{label}</label>
      <select
        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
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
      <label className="block font-medium text-gray-400 mb-2 text-sm">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
        value={value || ""}
        onChange={e => onFieldChange(fieldName, e.target.value)}
      />
    </div>
  );
};

const Select = ({ label, value, onFieldChange, fieldName, children }) => {
  return (
    <div className="w-full">
      <label className="block font-medium text-gray-400 mb-2 text-sm">{label}</label>
      <select
        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
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
        <h3 className="text-lg font-semibold text-white mb-4">Core Project Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <h3 className="text-lg font-semibold text-white mb-4">Project Codes</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div className="mt-6 flex items-center gap-4">
          <button onClick={generateQuoteId} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={!quote.customer}>
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
        <h3 className="text-lg font-semibold text-white mb-4">Panel Specifications</h3>
        <p className="text-gray-400 text-sm mb-6">Configure the control panel for this project</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

// Step 3: Product Configuration Form (Data-Driven)
function ProductConfigurationForm({ currentTemplate, productConfiguration, setProductConfiguration }) {
  const [customFields, setCustomFields] = React.useState([]);
  const [showAddField, setShowAddField] = React.useState(false);
  const [newField, setNewField] = React.useState({
    fieldName: '',
    fieldType: 'Boolean',
    section: 'digitalIn'
  });

  console.log('ProductConfigurationForm - Current config:', productConfiguration);

  if (!currentTemplate) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg text-center">
        <p className="text-gray-400">Please select a product in Step 1 to configure.</p>
      </div>
    );
  }

  const handleFieldChange = (fieldName, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleMotorHeaterChange = (fieldName, property, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [fieldName]: {
        ...(typeof prev[fieldName] === 'object' ? prev[fieldName] : {}),
        [property]: value
      }
    }));
  };

  const handleAddCustomField = () => {
    if (!newField.fieldName.trim()) {
      alert('Please enter a field name');
      return;
    }

    const field = {
      fieldName: newField.fieldName,
      fieldType: newField.fieldType,
      listOptions: [],
      bomLogic: {}
    };

    setCustomFields(prev => [...prev, { ...field, section: newField.section }]);
    setNewField({ fieldName: '', fieldType: 'Boolean', section: 'digitalIn' });
    setShowAddField(false);
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  // Collect all fields from all sections plus custom fields
  const allFields = [
    ...(currentTemplate.fields?.digitalIn || []).map(f => ({ ...f, section: 'Digital In' })),
    ...(currentTemplate.fields?.analogIn || []).map(f => ({ ...f, section: 'Analog In' })),
    ...(currentTemplate.fields?.digitalOut || []).map(f => ({ ...f, section: 'Digital Out' })),
    ...(currentTemplate.fields?.analogOut || []).map(f => ({ ...f, section: 'Analog Out' })),
    ...customFields.map(f => ({ 
      ...f, 
      section: f.section === 'digitalIn' ? 'Digital In (Custom)' :
               f.section === 'analogIn' ? 'Analog In (Custom)' :
               f.section === 'digitalOut' ? 'Digital Out (Custom)' :
               'Analog Out (Custom)',
      isCustom: true 
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-800 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Product Configuration</h3>
            <p className="text-gray-400 text-sm">
              Configure {currentTemplate.productName || 'this product'}
            </p>
          </div>
          <button
            onClick={() => setShowAddField(!showAddField)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
          >
            {showAddField ? 'Cancel' : '+ Add Custom I/O'}
          </button>
        </div>

        {showAddField && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h4 className="text-white font-medium mb-3">Add Custom I/O Field</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Field Name</label>
                <input
                  type="text"
                  value={newField.fieldName}
                  onChange={e => setNewField({ ...newField, fieldName: e.target.value })}
                  placeholder="e.g., Alarm Horn"
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Field Type</label>
                <select
                  value={newField.fieldType}
                  onChange={e => setNewField({ ...newField, fieldType: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                >
                  <option value="Boolean">Yes/No (Boolean)</option>
                  <option value="Number">Number</option>
                  <option value="Text">Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">I/O Section</label>
                <select
                  value={newField.section}
                  onChange={e => setNewField({ ...newField, section: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                >
                  <option value="digitalIn">Digital Input</option>
                  <option value="digitalOut">Digital Output</option>
                  <option value="analogIn">Analog Input</option>
                  <option value="analogOut">Analog Output</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAddCustomField}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
              >
                Add Field
              </button>
            </div>
          </div>
        )}
        
        {allFields.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No configuration fields defined. Click "Add Custom I/O" to add fields.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allFields.map((field, index) => {
              const currentValue = productConfiguration[field.fieldName] ?? '';
              
              return (
                <div key={`${field.fieldName}-${index}`} className="p-4 bg-gray-700 rounded-lg relative">
                  {field.isCustom && (
                    <button
                      onClick={() => handleRemoveCustomField(customFields.findIndex(f => f.fieldName === field.fieldName))}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-xs"
                      title="Remove custom field"
                    >
                      ✕
                    </button>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-medium text-white">
                      {field.fieldName}
                    </label>
                    <span className="text-xs text-gray-500">{field.section}</span>
                  </div>
                  
                  {/* Special handling for Motor and Heater fields */}
                  {(field.fieldName === 'Motor' || field.fieldName === 'Heater') && field.fieldType === 'List' && (
                    <div className="space-y-2">
                      <select
                        value={currentValue?.type || ''}
                        onChange={e => handleMotorHeaterChange(field.fieldName, 'type', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                      >
                        <option value="">Select Control Type...</option>
                        {field.listOptions?.map(option => (
                          <option key={option.value || option.name} value={option.value || option.name}>
                            {option.label || option.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={currentValue?.power || ''}
                        onChange={e => handleMotorHeaterChange(field.fieldName, 'power', e.target.value)}
                        placeholder={field.fieldName === 'Motor' ? 'HP' : 'kW'}
                        step="0.1"
                        min="0"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                      />
                      <span className="text-xs text-gray-400">
                        {field.fieldName === 'Motor' ? 'Horsepower (HP)' : 'Kilowatts (kW)'}
                      </span>
                    </div>
                  )}
                  
                  {/* Standard List field for non-Motor/Heater */}
                  {field.fieldType === 'List' && field.fieldName !== 'Motor' && field.fieldName !== 'Heater' && (
                    <select
                      value={currentValue}
                      onChange={e => handleFieldChange(field.fieldName, e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                    >
                      <option value="">Select...</option>
                      {field.listOptions?.map(option => (
                        <option key={option.value || option.name} value={option.value || option.name}>
                          {option.label || option.name}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {field.fieldType === 'Number' && (
                    <input
                      type="number"
                      value={currentValue}
                      onChange={e => handleFieldChange(field.fieldName, e.target.value)}
                      min={field.min}
                      max={field.max}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                    />
                  )}
                  
                  {field.fieldType === 'Text' && (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={e => handleFieldChange(field.fieldName, e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                    />
                  )}
                  
                  {field.fieldType === 'Boolean' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentValue === true || currentValue === 'true'}
                        onChange={e => handleFieldChange(field.fieldName, e.target.checked)}
                        className="mr-2 h-4 w-4"
                      />
                      <span className="text-gray-300">Yes</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 4: Assembly Selection & BOM
function AssemblySelection({ currentTemplate, productConfiguration, selectedAssemblies, setSelectedAssemblies }) {
  const [availableAssemblies, setAvailableAssemblies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const loadAssemblies = async () => {
      if (!currentTemplate) return;
      
      setIsLoading(true);
      try {
        const allAssemblies = await window.assemblies.getAll();
        setAvailableAssemblies(allAssemblies);
        
        // Auto-select required assemblies from new schema structure
        const autoSelected = [
          ...(currentTemplate.assemblies?.required || [])
        ];
        setSelectedAssemblies(autoSelected);
      } catch (error) {
        console.error('Error loading assemblies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAssemblies();
  }, [currentTemplate]);

  const handleToggleAssembly = (assemblyId) => {
    // Prevent deselecting required assemblies
    if (currentTemplate.assemblies?.required?.includes(assemblyId)) {
      return;
    }
    
    setSelectedAssemblies(prev => {
      if (prev.includes(assemblyId)) {
        return prev.filter(id => id !== assemblyId);
      } else {
        return [...prev, assemblyId];
      }
    });
  };

  const handleGenerateBom = async () => {
    if (!currentTemplate || !productConfiguration) {
      console.log('Cannot generate BOM: missing template or configuration');
      return;
    }
    
    console.log('Generating BOM for template:', currentTemplate);
    console.log('Product configuration:', productConfiguration);
    
    setIsGenerating(true);
    try {
      const allFields = [
        ...(currentTemplate.fields?.digitalIn || []),
        ...(currentTemplate.fields?.analogIn || []),
        ...(currentTemplate.fields?.digitalOut || []),
        ...(currentTemplate.fields?.analogOut || [])
      ];
      
      console.log('All fields:', allFields);
      
      const bomAssemblies = new Set([
        ...(currentTemplate.assemblies?.required || []),
        ...(currentTemplate.assemblies?.recommended || [])
      ]);
      
      console.log('Initial BOM assemblies (required + recommended):', Array.from(bomAssemblies));
      
      // Loop through each configured field
      for (const [fieldName, fieldValue] of Object.entries(productConfiguration)) {
        if (!fieldValue) continue; // Skip empty values
        
        // Find the field definition
        const fieldDef = allFields.find(f => f.fieldName === fieldName);
        if (!fieldDef) continue;
        
        // For Motor/Heater fields with type and power
        if (fieldDef.fieldType === 'List' && typeof fieldValue === 'object' && fieldValue.type) {
          const selectedOption = fieldDef.listOptions.find(opt => (opt.value || opt.name) === fieldValue.type);
          
          if (selectedOption?.bomLogic) {
            console.log(`Searching assemblies for ${fieldName} (${fieldValue.type}, ${fieldValue.power}${fieldName === 'Motor' ? 'HP' : 'kW'}):`, selectedOption.bomLogic);
            const matchingAssemblies = await window.assemblies.search(selectedOption.bomLogic);
            console.log('Found matching assemblies:', matchingAssemblies);
            matchingAssemblies.forEach(asm => bomAssemblies.add(asm.assemblyId));
          }
        }
        // For standard List fields
        else if (fieldDef.fieldType === 'List' && fieldDef.listOptions) {
          const selectedOption = fieldDef.listOptions.find(opt => (opt.value || opt.name) === fieldValue);
          
          if (selectedOption?.bomLogic) {
            console.log('Searching assemblies with bomLogic:', selectedOption.bomLogic);
            // Search for assemblies matching the bomLogic
            const matchingAssemblies = await window.assemblies.search(selectedOption.bomLogic);
            console.log('Found matching assemblies:', matchingAssemblies);
            matchingAssemblies.forEach(asm => bomAssemblies.add(asm.assemblyId));
          }
        }
      }
      
      // Update selected assemblies with generated BOM
      const finalAssemblies = Array.from(bomAssemblies);
      console.log('Final BOM assemblies:', finalAssemblies);
      setSelectedAssemblies(finalAssemblies);
      
    } catch (error) {
      console.error('Error generating BOM:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentTemplate) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg text-center">
        <p className="text-gray-400">Please select a product in Step 1 to configure assemblies.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg text-center">
        <p className="text-gray-400">Loading assemblies...</p>
      </div>
    );
  }

  const categorizedAssemblies = (assemblyIds) => {
    return assemblyIds.map(id => availableAssemblies.find(a => a.assemblyId === id)).filter(Boolean);
  };

  const requiredAssemblies = categorizedAssemblies(currentTemplate.assemblies?.required || []);
  const optionalAssemblies = categorizedAssemblies(currentTemplate.assemblies?.optional || []);

  return (
    <div className="space-y-6">
      {/* BOM Generation Button */}
      <div className="p-4 bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Generate BOM</h3>
            <p className="text-gray-400 text-sm">
              Auto-select assemblies based on your product configuration
            </p>
          </div>
          <button
            onClick={handleGenerateBom}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate BOM'}
          </button>
        </div>
      </div>

      {/* Required Assemblies */}
      {requiredAssemblies.length > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-white mb-4">Required Assemblies</h3>
          <p className="text-gray-400 text-sm mb-4">These assemblies are always included.</p>
          <div className="space-y-2">
            {requiredAssemblies.map(assembly => (
              <div key={assembly.assemblyId} className="flex items-center p-3 bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="mr-3 h-4 w-4"
                />
                <div className="flex-1">
                  <p className="text-white font-medium">{assembly.description}</p>
                  <p className="text-gray-400 text-sm">{assembly.assemblyId} - {assembly.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Assemblies */}
      {optionalAssemblies.length > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-white mb-4">Optional Assemblies</h3>
          <p className="text-gray-400 text-sm mb-4">Additional assemblies you can add as needed.</p>
          <div className="space-y-2">
            {optionalAssemblies.map(assembly => (
              <div key={assembly.assemblyId} className="flex items-center p-3 bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedAssemblies.includes(assembly.assemblyId)}
                  onChange={() => handleToggleAssembly(assembly.assemblyId)}
                  className="mr-3 h-4 w-4"
                />
                <div className="flex-1">
                  <p className="text-white font-medium">{assembly.description}</p>
                  <p className="text-gray-400 text-sm">{assembly.assemblyId} - {assembly.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
    projectCodes: { industry: '', product: '', control: '', scope: '' },
    controlPanelConfig: {},
    productConfiguration: {},
    bom: []
  });
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [selectedAssemblies, setSelectedAssemblies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedNumber, setGeneratedNumber] = useState('');
  const [schemas, setSchemas] = useState({ industry: [], product: [], control: [], scope: [] });
  const [customers, setCustomers] = useState([]);
  const [panelOptions, setPanelOptions] = useState({ voltage: [], phase: [], enclosureType: [], enclosureRating: [], hmiSize: [], plcPlatform: [] });

  useEffect(() => {
    const loadData = async () => {
      try {
        const industry = await window.schemas.getIndustry();
        const product = await window.schemas.getProduct();
        const control = await window.schemas.getControl();
        const scope = await window.schemas.getScope();
        const c = await window.customers.getAll();
        const options = await window.schemas.getPanelOptions();
        
        setSchemas({ industry, product, control, scope });
        setCustomers(c);
        setPanelOptions(options);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

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
          
          // Clear productConfiguration when product changes
          setQuote(prev => ({
            ...prev,
            productConfiguration: {}
          }));
        } else {
          // No template found - use empty state
          setCurrentTemplate({
            productCode: productCode,
            productName: 'Custom Product',
            fields: {},
            assemblies: {
              required: [],
              optional: []
            }
          });
          
          setQuote(prev => ({
            ...prev,
            productConfiguration: {}
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

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Quote Configurator</h1>
          <p className="text-gray-400">Configure quotes for Craft Automation products</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
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
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button 
            onClick={handlePrev} 
            disabled={currentStep === 1}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={handleSave} 
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Save Quote'}
            </button>
          </div>

          <button 
            onClick={handleNext} 
            disabled={currentStep === steps.length}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
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
