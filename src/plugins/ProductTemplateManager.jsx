import React, { useState, useEffect } from 'react';
import { FileCode, Plus, Edit, Save, X, AlertCircle, Loader, Trash2, Settings } from 'lucide-react';

export default function ProductTemplateManager({ context, onNavigate }) {
  const [productSchema, setProductSchema] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductCode, setSelectedProductCode] = useState(null);
  const [template, setTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const IO_SECTIONS = ['DI', 'DO', 'AI', 'AO'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schema, assembliesData] = await Promise.all([
        window.schemas.getProduct(),
        window.assemblies.getAll()
      ]);
      
      // Extract oneOf options from schema
      const products = schema?.properties?.productCode?.oneOf || [];
      setProductSchema(products);
      setAssemblies(assembliesData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProduct = async (productCode) => {
    try {
      setError(null);
      setSuccess(null);
      setSelectedProductCode(productCode);
      
      // Try to load existing template
      const existingTemplate = await window.productTemplates.get(productCode);
      
      if (existingTemplate) {
        setTemplate(existingTemplate);
      } else {
        // Create new template with defaults
        const product = productSchema.find(p => p.const === productCode);
        setTemplate({
          productCode: productCode,
          productName: product?.description || '',
          availableSections: [],
          defaultAssemblies: [],
          requiredAssemblies: [],
          optionalAssemblies: [],
          ioDefaults: {
            DI: { min: 0, max: 100, default: 0 },
            DO: { min: 0, max: 100, default: 0 },
            AI: { min: 0, max: 50, default: 0 },
            AO: { min: 0, max: 50, default: 0 }
          },
          estimatedBaseLaborHours: 0,
          notes: ''
        });
      }
      setIsEditing(true);
    } catch (err) {
      console.error('Failed to load template:', err);
      setError(`Failed to load template: ${err.message}`);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Basic validation
      if (!template.productCode || !template.productName) {
        setError('Product Code and Product Name are required');
        return;
      }

      if (template.availableSections.length === 0) {
        setError('At least one I/O section must be enabled');
        return;
      }

      const result = await window.productTemplates.save(template);
      
      if (result.success) {
        setSuccess(`Template for product ${template.productCode} saved successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Validation failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSection = (section) => {
    const sections = [...template.availableSections];
    const index = sections.indexOf(section);
    
    if (index > -1) {
      sections.splice(index, 1);
    } else {
      sections.push(section);
    }
    
    setTemplate({ ...template, availableSections: sections });
  };

  const handleToggleAssembly = (assemblyId, listType) => {
    const list = [...(template[listType] || [])];
    const index = list.indexOf(assemblyId);
    
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(assemblyId);
    }
    
    setTemplate({ ...template, [listType]: list });
  };

  const handleUpdateIODefaults = (section, field, value) => {
    setTemplate({
      ...template,
      ioDefaults: {
        ...template.ioDefaults,
        [section]: {
          ...template.ioDefaults[section],
          [field]: parseInt(value) || 0
        }
      }
    });
  };

  const handleBack = () => {
    setIsEditing(false);
    setSelectedProductCode(null);
    setTemplate(null);
    setError(null);
    setSuccess(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-500" size={32} />
        <span className="ml-3 text-gray-400">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {!isEditing ? (
          <>
            {/* Product Selection View */}
            <h1 className="text-3xl font-bold text-white mb-6">Product Template Manager</h1>
            
            <div className="mb-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">About Product Templates</h3>
              <p className="text-sm text-blue-300">
                Product templates define the configuration options for the Quote Configurator.
                Select a product to configure its available I/O sections, default assemblies, and other settings.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Select a Product to Configure
              </h2>
              
              {productSchema.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No products found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productSchema.map(prod => (
                    <button
                      key={prod.const}
                      onClick={() => handleSelectProduct(prod.const)}
                      className="p-4 bg-gray-700 rounded-lg text-left hover:bg-gray-600 transition-colors border border-gray-600 hover:border-blue-500"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FileCode className="text-blue-400" size={24} />
                        <h3 className="text-lg font-semibold text-white font-mono">
                          {prod.const}
                        </h3>
                      </div>
                      <p className="text-gray-300 text-sm">{prod.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Template Editor View */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Configure Product {template.productCode}
                </h1>
                <p className="text-gray-400 mt-1">{template.productName}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Back to Products
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Template
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-red-400 font-semibold">Error</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                  <X size={18} />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-green-400 font-semibold">Success</p>
                  <p className="text-green-300 text-sm">{success}</p>
                </div>
                <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Product Code
                    </label>
                    <input
                      type="number"
                      value={template.productCode}
                      disabled
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={template.productName}
                      onChange={(e) => setTemplate({ ...template, productName: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Base Labor Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={template.estimatedBaseLaborHours || 0}
                      onChange={(e) => setTemplate({ ...template, estimatedBaseLaborHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={template.notes || ''}
                      onChange={(e) => setTemplate({ ...template, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Configuration notes or instructions..."
                    />
                  </div>
                </div>
              </div>

              {/* Available I/O Sections */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Available I/O Sections *
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {IO_SECTIONS.map(section => (
                    <button
                      key={section}
                      onClick={() => handleToggleSection(section)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        template.availableSections.includes(section)
                          ? 'bg-blue-900/50 border-blue-500 text-blue-300'
                          : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-mono font-bold text-xl">{section}</p>
                        <p className="text-xs mt-1">
                          {section === 'DI' && 'Digital Input'}
                          {section === 'DO' && 'Digital Output'}
                          {section === 'AI' && 'Analog Input'}
                          {section === 'AO' && 'Analog Output'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* I/O Defaults for enabled sections */}
                {template.availableSections.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-white">I/O Count Defaults</h4>
                    {template.availableSections.map(section => (
                      <div key={section} className="bg-gray-700/50 p-4 rounded-md">
                        <h5 className="font-semibold text-white mb-3">{section}</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Minimum</label>
                            <input
                              type="number"
                              min="0"
                              value={template.ioDefaults[section]?.min || 0}
                              onChange={(e) => handleUpdateIODefaults(section, 'min', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Maximum</label>
                            <input
                              type="number"
                              min="0"
                              value={template.ioDefaults[section]?.max || 100}
                              onChange={(e) => handleUpdateIODefaults(section, 'max', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Default</label>
                            <input
                              type="number"
                              min="0"
                              value={template.ioDefaults[section]?.default || 0}
                              onChange={(e) => handleUpdateIODefaults(section, 'default', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assembly Configuration */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Assembly Configuration</h3>
                
                <div className="space-y-6">
                  {/* Default Assemblies */}
                  <div>
                    <h4 className="text-md font-semibold text-white mb-3">Default Assemblies</h4>
                    <p className="text-sm text-gray-400 mb-3">Pre-selected when creating a new quote</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {assemblies.map(asm => (
                        <label
                          key={asm.assemblyId}
                          className="flex items-center gap-2 p-2 bg-gray-700/50 rounded hover:bg-gray-700/70 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={template.defaultAssemblies.includes(asm.assemblyId)}
                            onChange={() => handleToggleAssembly(asm.assemblyId, 'defaultAssemblies')}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">{asm.assemblyId} - {asm.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Required Assemblies */}
                  <div>
                    <h4 className="text-md font-semibold text-white mb-3">Required Assemblies</h4>
                    <p className="text-sm text-gray-400 mb-3">Cannot be removed from quote</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {assemblies.map(asm => (
                        <label
                          key={asm.assemblyId}
                          className="flex items-center gap-2 p-2 bg-gray-700/50 rounded hover:bg-gray-700/70 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={template.requiredAssemblies.includes(asm.assemblyId)}
                            onChange={() => handleToggleAssembly(asm.assemblyId, 'requiredAssemblies')}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">{asm.assemblyId} - {asm.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Optional Assemblies */}
                  <div>
                    <h4 className="text-md font-semibold text-white mb-3">Optional Assemblies</h4>
                    <p className="text-sm text-gray-400 mb-3">Available to add during quote configuration</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {assemblies.map(asm => (
                        <label
                          key={asm.assemblyId}
                          className="flex items-center gap-2 p-2 bg-gray-700/50 rounded hover:bg-gray-700/70 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={template.optionalAssemblies.includes(asm.assemblyId)}
                            onChange={() => handleToggleAssembly(asm.assemblyId, 'optionalAssemblies')}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">{asm.assemblyId} - {asm.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
