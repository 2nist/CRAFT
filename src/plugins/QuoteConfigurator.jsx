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

// Step 3: I/O Configuration Form
function IOConfigurationForm({ currentTemplate, productConfiguration, setProductConfiguration }) {
  if (!currentTemplate) {
    return (
      <div className="p-8 bg-gray-800 rounded-lg text-center">
        <p className="text-gray-400">Please select a product in Step 1 to configure I/O sections.</p>
      </div>
    );
  }

  const handleIOChange = (section, value) => {
    setProductConfiguration(prev => ({
      ...prev,
      [section]: parseInt(value) || 0
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-white mb-4">I/O Configuration</h3>
        <p className="text-gray-400 text-sm mb-6">
          Configure the I/O counts for this {currentTemplate.productName || 'product'}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentTemplate.availableSections && currentTemplate.availableSections.map(section => {
            const defaults = currentTemplate.ioDefaults?.[section] || { min: 0, max: 100, default: 0 };
            const currentValue = productConfiguration[section] ?? defaults.default;
            
            return (
              <div key={section} className="p-4 bg-gray-700 rounded-lg">
                <label className="block font-medium text-white mb-2">
                  {section === 'DI' ? 'Digital Inputs' : 
                   section === 'DO' ? 'Digital Outputs' : 
                   section === 'AI' ? 'Analog Inputs' : 
                   'Analog Outputs'}
                </label>
                <input
                  type="number"
                  min={defaults.min}
                  max={defaults.max}
                  value={currentValue}
                  onChange={e => handleIOChange(section, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Range: {defaults.min} - {defaults.max} (default: {defaults.default})
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Step 4: Assembly Selection & BOM
function AssemblySelection({ currentTemplate, selectedAssemblies, setSelectedAssemblies }) {
  const [availableAssemblies, setAvailableAssemblies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAssemblies = async () => {
      if (!currentTemplate) return;
      
      setIsLoading(true);
      try {
        const allAssemblies = await window.assemblies.getAll();
        setAvailableAssemblies(allAssemblies);
        
        // Auto-select default and required assemblies
        const autoSelected = [
          ...(currentTemplate.defaultAssemblies || []),
          ...(currentTemplate.requiredAssemblies || [])
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
    if (currentTemplate.requiredAssemblies?.includes(assemblyId)) {
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

  const requiredAssemblies = categorizedAssemblies(currentTemplate.requiredAssemblies || []);
  const defaultAssemblies = categorizedAssemblies(currentTemplate.defaultAssemblies || []);
  const optionalAssemblies = categorizedAssemblies(currentTemplate.optionalAssemblies || []);

  return (
    <div className="space-y-6">
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

      {/* Default Assemblies */}
      {defaultAssemblies.length > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-white mb-4">Default Assemblies</h3>
          <p className="text-gray-400 text-sm mb-4">Pre-selected assemblies (you can deselect if not needed).</p>
          <div className="space-y-2">
            {defaultAssemblies.map(assembly => (
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const industry = await window.schemas.getIndustry();
        const product = await window.schemas.getProduct();
        const control = await window.schemas.getControl();
        const scope = await window.schemas.getScope();
        const c = await window.customers.getAll();
        
        setSchemas({ industry, product, control, scope });
        setCustomers(c);
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
        return;
      }
      
      try {
        const template = await window.productTemplates.get(productCode);
        
        if (template) {
          setCurrentTemplate(template);
          
          // Initialize productConfiguration with default I/O values
          const defaultConfig = {};
          if (template.availableSections) {
            template.availableSections.forEach(section => {
              const defaults = template.ioDefaults?.[section];
              if (defaults) {
                defaultConfig[section] = defaults.default || 0;
              }
            });
          }
          
          setQuote(prev => ({
            ...prev,
            productConfiguration: defaultConfig
          }));
        } else {
          // No template found - use empty state
          setCurrentTemplate({
            productCode: productCode,
            productName: 'Custom Product',
            availableSections: [],
            defaultAssemblies: [],
            requiredAssemblies: [],
            optionalAssemblies: []
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
            <div className="p-8 bg-gray-800 rounded-lg text-center">
              <p className="text-gray-400">Panel Configuration (placeholder for future development)</p>
            </div>
          )}
          {currentStep === 3 && (
            <IOConfigurationForm
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
