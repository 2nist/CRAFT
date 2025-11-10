import React, { useState, useEffect, useMemo } from 'react';
import { FileCode, Plus, Edit, Save, X, AlertCircle, Loader, Trash2, Eye, Copy, Package, Beer, Martini, Wine, Wheat, Cog, Gauge, Droplets, Airplay, Flame, Layers, CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Product Template Manager V2.0
 * 
 * Manages product templates using the v2.0 Assembly Card architecture.
 * Each template contains an array of "assemblies" (Process Cards), where each
 * assembly has its own:
 * - fields (I/O configuration)
 * - subAssemblies (required/optional sub-assembly IDs)
 * - ioFieldRules (component generation rules)
 */
export default function ProductTemplateManagerV2({ context, onNavigate }) {
  // Core state
  const [productSchema, setProductSchema] = useState([]);
  const [subAssemblies, setSubAssemblies] = useState([]);
  const [existingTemplates, setExistingTemplates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Template editor state
  const [selectedProductCode, setSelectedProductCode] = useState(null);
  const [template, setTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // UI state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedProductLine, setSelectedProductLine] = useState(null);
  const [viewMode, setViewMode] = useState('categories');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Assembly editor state
  const [selectedAssemblyIndex, setSelectedAssemblyIndex] = useState(null);
  const [expandedAssemblies, setExpandedAssemblies] = useState({});
  const [showAssemblyEditor, setShowAssemblyEditor] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState(null);
  
  // Simple mode state
  const [templateMode, setTemplateMode] = useState('simple'); // 'simple' or 'advanced'
  const [showAssemblyPicker, setShowAssemblyPicker] = useState(false);
  const [showSubAssemblyPicker, setShowSubAssemblyPicker] = useState(false);
  const [assemblySearchQuery, setAssemblySearchQuery] = useState('');
  const [subAssemblySearchQuery, setSubAssemblySearchQuery] = useState('');
  
  // Field editor state
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [activeFieldSection, setActiveFieldSection] = useState('digitalIn');

  const IO_SECTIONS = ['digitalIn', 'digitalOut', 'analogIn', 'analogOut'];
  
  const FIELD_TYPE_OPTIONS = [
    { value: 'Boolean', label: 'Boolean (Checkbox)' },
    { value: 'Number', label: 'Number' },
    { value: 'Text', label: 'Text' },
    { value: 'List', label: 'List (Dropdown)' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Helper function to normalize template data for consistent handling
  const normalizeTemplateData = (template) => {
    if (!template) return template;
    
    const normalized = { ...template };
    
    // Normalize assemblies - convert objects to strings for Simple Mode compatibility
    if (Array.isArray(normalized.assemblies)) {
      normalized.assemblies = normalized.assemblies.map(assembly => {
        if (typeof assembly === 'string') {
          return assembly;
        } else if (typeof assembly === 'object' && assembly.assemblyId) {
          return assembly.assemblyId;
        }
        return assembly;
      });
    }
    
    // Ensure subAssemblies is an array of strings
    if (Array.isArray(normalized.subAssemblies)) {
      normalized.subAssemblies = normalized.subAssemblies.map(subAssembly => {
        if (typeof subAssembly === 'string') {
          return subAssembly;
        } else if (typeof subAssembly === 'object' && subAssembly.subAssemblyId) {
          return subAssembly.subAssemblyId;
        }
        return subAssembly;
      });
    } else {
      normalized.subAssemblies = [];
    }
    
    return normalized;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [products, subAssemblyData] = await Promise.all([
        window.schemas.getProduct(),
        window.subAssemblies.getAll()
      ]);
      
      setProductSchema(products || []);
      setSubAssemblies(subAssemblyData || []);
      
      await loadExistingTemplates(products || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingTemplates = async (products) => {
    try {
      const templates = {};
      for (const prod of products) {
        try {
          const template = await window.productTemplates.get(prod.const);
          if (template) {
            templates[prod.const] = template;
          }
        } catch (err) {
          // Template doesn't exist, skip
        }
      }
      setExistingTemplates(templates);
    } catch (err) {
      console.error('Failed to load existing templates:', err);
    }
  };

  const productLines = useMemo(() => {
    const categoryRanges = [
      { min: 100, max: 149, name: 'Brewhouse', code: 100 },
      { min: 150, max: 199, name: 'Distilling', code: 150 },
      { min: 200, max: 249, name: 'Grain', code: 200 },
      { min: 250, max: 299, name: 'Ferment', code: 250 },
      { min: 300, max: 349, name: 'Packaging', code: 300 },
      { min: 350, max: 399, name: 'Utilities', code: 350 },
      { min: 400, max: 449, name: 'Process', code: 400 },
      { min: 450, max: 499, name: 'Safety', code: 450 },
      { min: 500, max: 549, name: 'Remote IO', code: 500 },
      { min: 550, max: 599, name: 'Custom', code: 550 }
    ];

    const lines = {};
    productSchema.forEach(prod => {
      const category = categoryRanges.find(cat => prod.const >= cat.min && prod.const <= cat.max);
      if (category) {
        if (!lines[category.code]) {
          lines[category.code] = {
            code: category.code,
            name: category.name,
            products: []
          };
        }
        lines[category.code].products.push(prod);
      }
    });
    
    return Object.values(lines).sort((a, b) => a.code - b.code);
  }, [productSchema]);

  const availableNumbers = useMemo(() => {
    if (!selectedProductLine) return [];
    
    const categoryRanges = [
      { min: 100, max: 149, code: 100 },
      { min: 150, max: 199, code: 150 },
      { min: 200, max: 249, code: 200 },
      { min: 250, max: 299, code: 250 },
      { min: 300, max: 349, code: 300 },
      { min: 350, max: 399, code: 350 },
      { min: 400, max: 449, code: 400 },
      { min: 450, max: 499, code: 450 },
      { min: 500, max: 549, code: 500 },
      { min: 550, max: 599, code: 550 }
    ];
    
    const category = categoryRanges.find(cat => cat.code === selectedProductLine);
    if (!category) return [];
    
    const usedNumbers = new Set(productSchema.map(p => p.const));
    const available = [];
    
    for (let i = category.min; i <= category.max; i++) {
      if (!usedNumbers.has(i)) {
        available.push(i);
      }
    }
    
    return available;
  }, [selectedProductLine, productSchema]);

  const filteredProducts = useMemo(() => {
    if (!selectedProductLine) return [];
    
    const categoryRanges = [
      { min: 100, max: 149, code: 100 },
      { min: 150, max: 199, code: 150 },
      { min: 200, max: 249, code: 200 },
      { min: 250, max: 299, code: 250 },
      { min: 300, max: 349, code: 300 },
      { min: 350, max: 399, code: 350 },
      { min: 400, max: 449, code: 400 },
      { min: 450, max: 499, code: 450 },
      { min: 500, max: 549, code: 500 },
      { min: 550, max: 599, code: 550 }
    ];
    
    const category = categoryRanges.find(cat => cat.code === selectedProductLine);
    if (!category) return [];
    
    let filtered = productSchema.filter(p => p.const >= category.min && p.const <= category.max);

    if (filterStatus === 'configured') {
      filtered = filtered.filter(p => existingTemplates[p.const]);
    } else if (filterStatus === 'unconfigured') {
      filtered = filtered.filter(p => !existingTemplates[p.const]);
    }

    return filtered.sort((a, b) => a.const - b.const);
  }, [productSchema, selectedProductLine, filterStatus, existingTemplates]);

  const getCategoryIcon = (code) => {
    const icons = {
      100: Beer,      // Brewhouse
      150: Martini,   // Distilling
      200: Wheat,     // Grain
      250: Wine,      // Ferment
      300: Package,   // Packaging
      350: Droplets,  // Utilities
      400: Cog,       // Process
      450: Gauge,     // Safety
      500: Airplay,   // Remote IO
      550: Flame      // Custom
    };
    return icons[code] || Package;
  };

  // Neutral icon color palette: brown & olive green
  const getCategoryIconColor = (code) => {
    // Tailwind neutral-like choices
    const brownClass = 'text-amber-700'; // brown tone
    const oliveClass = 'text-green-700'; // olive tone
    // Assign some categories to brown, others to olive for visual variation
    const brownCodes = new Set([100, 200, 300, 400, 500]);
    return brownCodes.has(code) ? brownClass : oliveClass;
  };

  const handleSelectCategory = (lineCode) => {
    setSelectedProductLine(lineCode);
    setViewMode('products');
  };

  const handleBackToCategories = () => {
    setSelectedProductLine(null);
    setViewMode('categories');
    setFilterStatus('all');
  };

  const handleSelectProduct = async (productCode) => {
    try {
      setError(null);
      setSuccess(null);
      setSelectedProductCode(productCode);
      
      const existingTemplate = await window.productTemplates.get(productCode);
      
      if (existingTemplate) {
        // Normalize the template data
        const normalizedTemplate = normalizeTemplateData(existingTemplate);
        setTemplate(normalizedTemplate);
        
        // Auto-detect mode based on normalized structure
        if (Array.isArray(normalizedTemplate.assemblies) && 
            normalizedTemplate.assemblies.length > 0 &&
            typeof normalizedTemplate.assemblies[0] === 'string') {
          setTemplateMode('simple');
        } else {
          setTemplateMode('advanced');
        }
      } else {
        const product = productSchema.find(p => p.const === productCode);
        setTemplate({
          productCode: productCode,
          productName: product?.description || '',
          estimatedBaseLaborHours: 0,
          notes: '',
          assemblies: [],
          subAssemblies: [] // Add for simple mode
        });
        setTemplateMode('simple'); // Default to simple
      }
      setIsEditing(true);
      setSelectedAssemblyIndex(null);
    } catch (err) {
      console.error('Failed to load template:', err);
      setError(`Failed to load template: ${err.message}`);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      if (!template.productCode || !template.productName) {
        setError('Product Code and Product Name are required');
        return;
      }

      // Validate based on mode
      if (templateMode === 'simple') {
        if (!template.assemblies || template.assemblies.length === 0) {
          setError('At least one assembly reference is required in Simple Mode');
          return;
        }
      }

      const result = await window.productTemplates.save(template);
      
      if (result.success) {
        setSuccess(`Template for product ${template.productCode} saved successfully`);
        setTimeout(() => setSuccess(null), 3000);
        // Reload templates
        await loadExistingTemplates(productSchema);
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

  const handleBack = () => {
    setIsEditing(false);
    setSelectedProductCode(null);
    setTemplate(null);
    setSelectedAssemblyIndex(null);
    setError(null);
    setSuccess(null);
  };

  // Assembly management
  const handleAddAssembly = () => {
    setEditingAssembly({
      assemblyId: '',
      displayName: '',
      description: '',
      allowMultiple: false,
      features: [],
      fields: {
        digitalIn: [],
        digitalOut: [],
        analogIn: [],
        analogOut: []
      },
      subAssemblies: {
        required: [],
        optional: []
      },
      ioFieldRules: []
    });
    setShowAssemblyEditor(true);
  };

  const handleEditAssembly = (index) => {
    setEditingAssembly({ ...template.assemblies[index], _index: index });
    setShowAssemblyEditor(true);
  };

  const handleSaveAssembly = () => {
    if (!editingAssembly.assemblyId || !editingAssembly.displayName) {
      setError('Assembly ID and Display Name are required');
      return;
    }

    const newAssemblies = [...(template.assemblies || [])];
    
    if (editingAssembly._index !== undefined) {
      // Edit existing
      newAssemblies[editingAssembly._index] = {
        assemblyId: editingAssembly.assemblyId,
        displayName: editingAssembly.displayName,
        description: editingAssembly.description || '',
        allowMultiple: editingAssembly.allowMultiple || false,
        features: editingAssembly.features || [],
        fields: editingAssembly.fields || { digitalIn: [], digitalOut: [], analogIn: [], analogOut: [] },
        subAssemblies: editingAssembly.subAssemblies || { required: [], optional: [] },
        ioFieldRules: editingAssembly.ioFieldRules || []
      };
    } else {
      // Add new
      newAssemblies.push({
        assemblyId: editingAssembly.assemblyId,
        displayName: editingAssembly.displayName,
        description: editingAssembly.description || '',
        allowMultiple: editingAssembly.allowMultiple || false,
        features: editingAssembly.features || [],
        fields: editingAssembly.fields || { digitalIn: [], digitalOut: [], analogIn: [], analogOut: [] },
        subAssemblies: editingAssembly.subAssemblies || { required: [], optional: [] },
        ioFieldRules: editingAssembly.ioFieldRules || []
      });
    }

    setTemplate({ ...template, assemblies: newAssemblies });
    setShowAssemblyEditor(false);
    setEditingAssembly(null);
  };

  const handleDeleteAssembly = (index) => {
    if (confirm(`Delete assembly "${template.assemblies[index].displayName}"?`)) {
      const newAssemblies = template.assemblies.filter((_, i) => i !== index);
      setTemplate({ ...template, assemblies: newAssemblies });
      if (selectedAssemblyIndex === index) {
        setSelectedAssemblyIndex(null);
      }
    }
  };

  const handleDuplicateAssembly = (index) => {
    const original = template.assemblies[index];
    const duplicate = {
      ...original,
      assemblyId: `${original.assemblyId}_copy`,
      displayName: `${original.displayName} (Copy)`
    };
    
    const newAssemblies = [...template.assemblies, duplicate];
    setTemplate({ ...template, assemblies: newAssemblies });
    setSuccess(`Duplicated "${original.displayName}"`);
    setTimeout(() => setSuccess(null), 2000);
  };

  // Field management (within an assembly)
  const handleAddFieldToAssembly = (assemblyIndex, section) => {
    setSelectedAssemblyIndex(assemblyIndex);
    setActiveFieldSection(section);
    setEditingField({
      fieldName: '',
      fieldType: 'Boolean',
      defaultValue: false,
      min: 0,
      max: 100,
      listOptions: []
    });
    setShowFieldEditor(true);
  };

  const handleEditField = (assemblyIndex, section, fieldIndex) => {
    setSelectedAssemblyIndex(assemblyIndex);
    setActiveFieldSection(section);
    const field = template.assemblies[assemblyIndex].fields[section][fieldIndex];
    setEditingField({ ...field, _index: fieldIndex });
    setShowFieldEditor(true);
  };

  const handleSaveField = () => {
    if (!editingField.fieldName.trim()) {
      setError('Field name is required');
      return;
    }

    const newAssemblies = [...template.assemblies];
    const assembly = newAssemblies[selectedAssemblyIndex];
    
    if (!assembly.fields[activeFieldSection]) {
      assembly.fields[activeFieldSection] = [];
    }

    const fieldData = {
      fieldName: editingField.fieldName,
      fieldType: editingField.fieldType
    };

    if (editingField.fieldType === 'Number') {
      if (editingField.min !== undefined) fieldData.min = editingField.min;
      if (editingField.max !== undefined) fieldData.max = editingField.max;
      if (editingField.defaultValue !== undefined) fieldData.defaultValue = editingField.defaultValue;
    } else if (editingField.fieldType === 'Boolean') {
      fieldData.defaultValue = editingField.defaultValue || false;
    } else if (editingField.fieldType === 'List') {
      fieldData.listOptions = editingField.listOptions || [];
    }

    if (editingField._index !== undefined) {
      assembly.fields[activeFieldSection][editingField._index] = fieldData;
    } else {
      assembly.fields[activeFieldSection].push(fieldData);
    }

    setTemplate({ ...template, assemblies: newAssemblies });
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (assemblyIndex, section, fieldIndex) => {
    const newAssemblies = [...template.assemblies];
    newAssemblies[assemblyIndex].fields[section].splice(fieldIndex, 1);
    setTemplate({ ...template, assemblies: newAssemblies });
  };

  // Sub-assembly management
  const handleToggleSubAssembly = (assemblyIndex, subAssemblyId, listType) => {
    const newAssemblies = [...template.assemblies];
    const list = newAssemblies[assemblyIndex].subAssemblies[listType] || [];
    const index = list.indexOf(subAssemblyId);
    
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(subAssemblyId);
    }
    
    newAssemblies[assemblyIndex].subAssemblies[listType] = list;
    setTemplate({ ...template, assemblies: newAssemblies });
  };

  const toggleAssemblyExpansion = (index) => {
    setExpandedAssemblies(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
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
            {/* Header */}
            <div className="mb-6 relative z-10">
              <h1 className="text-3xl font-bold text-white mb-2">
                {viewMode === 'categories'
                  ? 'Select a Product Category'
                  : productLines.find(l => l.code === selectedProductLine)?.name || 'Products'
                }
              </h1>
            </div>

            {/* Category View */}
            {viewMode === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productLines.map(line => {
                  const configuredCount = line.products.filter(p => existingTemplates[p.const]).length;
                  const totalCount = line.products.length;
                  const IconComponent = getCategoryIcon(line.code);
                  
                  return (
                    <button
                      key={line.code}
                      onClick={() => handleSelectCategory(line.code)}
                      className="relative p-5 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition-all border-2 border-gray-700 hover:border-blue-500 group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-16 h-16 bg-gray-800/40 rounded-xl group-hover:bg-gray-700/60 transition-colors flex-shrink-0">
                          <IconComponent className={getCategoryIconColor(line.code)} size={40} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-white font-mono">{line.code}s</h3>
                          <p className="text-sm text-gray-400">{totalCount} products</p>
                          <h4 className="text-base font-semibold text-gray-200 truncate">{line.name}</h4>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Products View */}
            {viewMode === 'products' && (
              <>
                <div className="mb-4">
                  <button
                    onClick={handleBackToCategories}
                    className="flex items-center gap-2 px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                  >
                    <X size={18} />
                    Back to Categories
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map(prod => {
                    const isConfigured = !!existingTemplates[prod.const];
                    const template = existingTemplates[prod.const];
                    
                    return (
                      <div
                        key={prod.const}
                        className={`relative p-4 rounded-lg transition-all border-2 ${
                          isConfigured
                            ? 'bg-gray-800/50 border-green-700/50 hover:border-green-500'
                            : 'bg-gray-800/30 border-gray-700/50 hover:border-blue-500'
                        }`}
                      >
                        <div className="absolute top-3 right-3">
                          {isConfigured ? (
                            <CheckCircle className="text-green-400" size={20} />
                          ) : (
                            <Circle className="text-gray-500" size={20} />
                          )}
                        </div>

                        <div className="flex items-start gap-3 mb-3">
                          <FileCode className={isConfigured ? 'text-green-400' : 'text-blue-400'} size={24} />
                          <div className="flex-1 pr-6">
                            <h3 className="text-lg font-semibold text-white font-mono mb-1">
                              {prod.const}
                            </h3>
                            <p className="text-gray-300 text-sm leading-tight">{prod.description}</p>
                          </div>
                        </div>

                        {isConfigured && template && (
                          <div className="mb-3 p-2 bg-gray-900/50 rounded text-xs space-y-1">
                            <div className="flex justify-between text-gray-400">
                              <span>Assemblies:</span>
                              <span className="text-gray-300">{template.assemblies?.length || 0}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Labor Hours:</span>
                              <span className="text-gray-300">{template.estimatedBaseLaborHours || 0}h</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelectProduct(prod.const)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-transparent text-white border border-transparent hover:border-orange-500 hover:bg-transparent transition-colors"
                          >
                            {isConfigured ? <><Edit size={16} />Edit</> : <><Plus size={16} />Create</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Template Editor */}
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
                  className="px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent disabled:opacity-50"
                >
                  {isSaving ? <><Loader className="animate-spin" size={18} />Saving...</> : <><Save size={18} />Save</>}
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-red-500" size={20} />
                <div className="flex-1">
                  <p className="text-red-400 font-semibold">Error</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-red-400">
                  <X size={18} />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-lg flex items-start gap-2">
                <CheckCircle className="text-green-500" size={20} />
                <p className="text-green-300">{success}</p>
                <button onClick={() => setSuccess(null)} className="text-green-400 ml-auto">
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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Product Code</label>
                    <input
                      type="number"
                      value={template.productCode}
                      disabled
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={template.productName}
                      onChange={(e) => setTemplate({ ...template, productName: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Estimated Base Labor Hours</label>
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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                    <textarea
                      value={template.notes || ''}
                      onChange={(e) => setTemplate({ ...template, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Template Mode Toggle */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Template Mode</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Simple: Reference existing assemblies • Advanced: Define custom fields
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTemplateMode('simple')}
                      className={`px-4 py-2 rounded-md transition-colors border ${
                        templateMode === 'simple' 
                          ? 'border-orange-500 text-white bg-transparent' 
                          : 'border-transparent text-gray-300 hover:border-orange-500 bg-transparent'
                      }`}
                    >
                      Simple Mode
                    </button>
                    <button
                      onClick={() => setTemplateMode('advanced')}
                      className={`px-4 py-2 rounded-md transition-colors border ${
                        templateMode === 'advanced' 
                          ? 'border-orange-500 text-white bg-transparent' 
                          : 'border-transparent text-gray-300 hover:border-orange-500 bg-transparent'
                      }`}
                    >
                      Advanced Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* Simple Mode Sections */}
              {templateMode === 'simple' && (
                <>
                  {/* Assembly References */}
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Assembly References</h3>
                        <p className="text-sm text-gray-400">Select existing assemblies from your library</p>
                      </div>
                      <button
                        onClick={() => setShowAssemblyPicker(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                      >
                        <Plus size={18} />
                        Add Assembly Reference
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(template.assemblies || []).filter(assembly => 
                        typeof assembly === 'string' || (typeof assembly === 'object' && assembly.assemblyId)
                      ).map((assembly, index) => {
                        const assemblyId = typeof assembly === 'string' ? assembly : assembly.assemblyId;
                        const displayName = typeof assembly === 'object' ? assembly.displayName : assembly;
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                            <div>
                              <span className="text-white font-mono">{assemblyId}</span>
                              {displayName && displayName !== assemblyId && (
                                <p className="text-xs text-gray-400">{displayName}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const newAssemblies = template.assemblies.filter((_, i) => i !== index);
                                setTemplate({ ...template, assemblies: newAssemblies });
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                      {(!template.assemblies || template.assemblies.length === 0) && (
                        <p className="text-center text-gray-500 py-4">No assemblies added yet</p>
                      )}
                    </div>
                  </div>

                  {/* Sub-Assembly References */}
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Sub-Assembly References</h3>
                        <p className="text-sm text-gray-400">Select base kits/sub-assemblies</p>
                      </div>
                      <button
                        onClick={() => setShowSubAssemblyPicker(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                      >
                        <Plus size={18} />
                        Add Sub-Assembly
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(template.subAssemblies || []).map((subAssemblyId, index) => {
                        const subAsm = subAssemblies.find(s => s.subAssemblyId === subAssemblyId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                            <div>
                              <span className="text-white font-mono">{subAssemblyId}</span>
                              {subAsm && <p className="text-xs text-gray-400">{subAsm.description}</p>}
                            </div>
                            <button
                              onClick={() => {
                                const newSubAssemblies = template.subAssemblies.filter((_, i) => i !== index);
                                setTemplate({ ...template, subAssemblies: newSubAssemblies });
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                      {(!template.subAssemblies || template.subAssemblies.length === 0) && (
                        <p className="text-center text-gray-500 py-4">No sub-assemblies added yet</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Advanced Mode - Assembly Cards */}
              {templateMode === 'advanced' && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Assembly Cards (Process Units)</h3>
                    <button
                      onClick={handleAddAssembly}
                      className="flex items-center gap-2 px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                    >
                      <Plus size={18} />
                      Add Assembly
                    </button>
                  </div>

                  <div className="space-y-3">
                    {template.assemblies && template.assemblies.length > 0 ? (
                      template.assemblies.map((assembly, index) => (
                        <div key={index} className="border border-gray-700 rounded-lg bg-gray-900/50">
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <button
                                onClick={() => toggleAssemblyExpansion(index)}
                                className="text-gray-400 hover:text-white"
                              >
                                {expandedAssemblies[index] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                              <div className="flex-1">
                                <h4 className="font-semibold text-white">{assembly.displayName}</h4>
                                <p className="text-sm text-gray-400">
                                  ID: {assembly.assemblyId} • {assembly.allowMultiple ? 'Multiple instances' : 'Single instance'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDuplicateAssembly(index)}
                                className="p-2 text-blue-400 hover:text-blue-300"
                                title="Duplicate"
                              >
                                <Copy size={18} />
                              </button>
                              <button
                                onClick={() => handleEditAssembly(index)}
                                className="p-2 text-blue-400 hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteAssembly(index)}
                                className="p-2 text-red-400 hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {expandedAssemblies[index] && (
                            <div className="border-t border-gray-700 p-4 space-y-4">
                              <p className="text-sm text-gray-300">{assembly.description}</p>
                              
                              {/* Field Summary */}
                              <div>
                                <h5 className="text-sm font-semibold text-gray-400 mb-2">I/O Fields</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  {IO_SECTIONS.map(section => {
                                    const count = assembly.fields?.[section]?.length || 0;
                                    return (
                                      <div key={section} className="bg-gray-800 p-2 rounded">
                                        <span className="text-gray-500">{section}:</span>
                                        <span className="ml-1 text-white font-semibold">{count}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Sub-Assemblies Summary */}
                              <div>
                                <h5 className="text-sm font-semibold text-gray-400 mb-2">Sub-Assemblies</h5>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-gray-800 p-2 rounded">
                                    <span className="text-gray-500">Required:</span>
                                    <span className="ml-1 text-white font-semibold">
                                      {assembly.subAssemblies?.required?.length || 0}
                                    </span>
                                  </div>
                                  <div className="bg-gray-800 p-2 rounded">
                                    <span className="text-gray-500">Optional:</span>
                                    <span className="ml-1 text-white font-semibold">
                                      {assembly.subAssemblies?.optional?.length || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No assemblies configured yet</p>
                        <p className="text-sm">Add an assembly to define process units for this product</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Assembly Editor Modal */}
            {showAssemblyEditor && editingAssembly && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-6xl w-full my-8">
                  <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">
                      {editingAssembly._index !== undefined ? 'Edit' : 'Add'} Assembly Card
                    </h3>
                    <button
                      onClick={() => { setShowAssemblyEditor(false); setEditingAssembly(null); }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Basic Assembly Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Assembly ID *</label>
                        <input
                          type="text"
                          value={editingAssembly.assemblyId}
                          onChange={(e) => setEditingAssembly({ ...editingAssembly, assemblyId: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., hlt, mash_tun, fermenter"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Display Name *</label>
                        <input
                          type="text"
                          value={editingAssembly.displayName}
                          onChange={(e) => setEditingAssembly({ ...editingAssembly, displayName: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Hot Liquor Tank"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                        <textarea
                          value={editingAssembly.description}
                          onChange={(e) => setEditingAssembly({ ...editingAssembly, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingAssembly.allowMultiple}
                            onChange={(e) => setEditingAssembly({ ...editingAssembly, allowMultiple: e.target.checked })}
                            className="rounded"
                          />
                          Allow multiple instances
                        </label>
                      </div>
                    </div>

                    {/* I/O Fields for this Assembly */}
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-md font-semibold text-white mb-3">I/O Fields for this Assembly</h4>
                      <div className="space-y-4">
                        {IO_SECTIONS.map(section => {
                          const fields = editingAssembly.fields?.[section] || [];
                          const sectionLabel = {
                            digitalIn: 'Digital Inputs',
                            digitalOut: 'Digital Outputs',
                            analogIn: 'Analog Inputs',
                            analogOut: 'Analog Outputs'
                          }[section];

                          return (
                            <div key={section} className="bg-gray-900/50 p-4 rounded-lg">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-semibold text-gray-300">{sectionLabel} ({fields.length})</h5>
                                <button
                                  onClick={() => handleAddFieldToAssembly(editingAssembly._index, section)}
                                  className="text-xs flex items-center gap-1 px-2 py-1 bg-transparent text-white rounded border border-transparent hover:border-orange-500 hover:bg-transparent"
                                >
                                  <Plus size={14} />
                                  Add Field
                                </button>
                              </div>
                              <div className="space-y-2">
                                {fields.map((field, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                    <div>
                                      <p className="text-sm text-white">{field.fieldName}</p>
                                      <p className="text-xs text-gray-500">Type: {field.fieldType}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleEditField(editingAssembly._index, section, idx)}
                                        className="p-1 text-blue-400 hover:text-blue-300"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteField(editingAssembly._index, section, idx)}
                                        className="p-1 text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {fields.length === 0 && (
                                  <p className="text-xs text-gray-500 text-center py-2">No fields</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub-Assemblies for this Assembly */}
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-md font-semibold text-white mb-3">Sub-Assemblies for this Assembly</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Required */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-400 mb-2">Required</h5>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {subAssemblies.map(sub => (
                              <label key={sub.subAssemblyId} className="flex items-center gap-2 p-2 bg-gray-900/50 rounded hover:bg-gray-900 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(editingAssembly.subAssemblies?.required || []).includes(sub.subAssemblyId)}
                                  onChange={() => handleToggleSubAssembly(editingAssembly._index, sub.subAssemblyId, 'required')}
                                  className="rounded"
                                />
                                <div className="text-xs text-gray-300 truncate">{sub.description}</div>
                              </label>
                            ))}
                          </div>
                        </div>
                        {/* Optional */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-400 mb-2">Optional</h5>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {subAssemblies.map(sub => (
                              <label key={sub.subAssemblyId} className="flex items-center gap-2 p-2 bg-gray-900/50 rounded hover:bg-gray-900 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(editingAssembly.subAssemblies?.optional || []).includes(sub.subAssemblyId)}
                                  onChange={() => handleToggleSubAssembly(editingAssembly._index, sub.subAssemblyId, 'optional')}
                                  className="rounded"
                                />
                                <div className="text-xs text-gray-300 truncate">{sub.description}</div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-end gap-3">
                    <button
                      onClick={() => { setShowAssemblyEditor(false); setEditingAssembly(null); }}
                      className="px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAssembly}
                      className="px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                    >
                      Save Assembly
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Field Editor Modal */}
            {showFieldEditor && editingField && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">
                      {editingField._index !== undefined ? 'Edit' : 'Add'} Field
                    </h3>
                    <button onClick={() => { setShowFieldEditor(false); setEditingField(null); }} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Field Name *</label>
                      <input
                        type="text"
                        value={editingField.fieldName}
                        onChange={(e) => setEditingField({ ...editingField, fieldName: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Temperature Sensor, Motor Control"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Field Type *</label>
                      <select
                        value={editingField.fieldType}
                        onChange={(e) => setEditingField({ ...editingField, fieldType: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {FIELD_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {editingField.fieldType === 'Number' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Min</label>
                          <input
                            type="number"
                            value={editingField.min !== undefined ? editingField.min : 0}
                            onChange={(e) => setEditingField({ ...editingField, min: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Max</label>
                          <input
                            type="number"
                            value={editingField.max !== undefined ? editingField.max : 100}
                            onChange={(e) => setEditingField({ ...editingField, max: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Default</label>
                          <input
                            type="number"
                            value={editingField.defaultValue !== undefined ? editingField.defaultValue : 0}
                            onChange={(e) => setEditingField({ ...editingField, defaultValue: parseFloat(e.target.value) })}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {editingField.fieldType === 'List' && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-gray-400">List Options</label>
                          <button
                            onClick={() => setEditingField({ 
                              ...editingField, 
                              listOptions: [...(editingField.listOptions || []), { name: '', bomLogic: {} }]
                            })}
                            className="text-xs flex items-center gap-1 px-2 py-1 bg-transparent text-white rounded border border-transparent hover:border-orange-500 hover:bg-transparent"
                          >
                            <Plus size={14} />
                            Add Option
                          </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(editingField.listOptions || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.name || ''}
                                onChange={(e) => {
                                  const newOptions = [...editingField.listOptions];
                                  newOptions[idx].name = e.target.value;
                                  setEditingField({ ...editingField, listOptions: newOptions });
                                }}
                                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                placeholder="Option name"
                              />
                              <button
                                onClick={() => {
                                  const newOptions = editingField.listOptions.filter((_, i) => i !== idx);
                                  setEditingField({ ...editingField, listOptions: newOptions });
                                }}
                                className="p-1 text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={() => { setShowFieldEditor(false); setEditingField(null); }}
                      className="px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveField}
                      className="px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                    >
                      Save Field
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Assembly Picker Modal */}
            {showAssemblyPicker && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Select Assemblies</h3>
                    <button onClick={() => setShowAssemblyPicker(false)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4 border-b border-gray-700">
                    <input
                      type="text"
                      value={assemblySearchQuery}
                      onChange={(e) => setAssemblySearchQuery(e.target.value)}
                      placeholder="Search assemblies..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                      {/* TODO: Load from Assembly Manager - for now show message */}
                      <div className="text-center py-8 text-gray-400">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Assembly library integration pending</p>
                        <p className="text-sm mt-2">
                          Manually enter assembly IDs for now, or use Advanced Mode to define custom assemblies
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Assembly Picker Modal */}
            {showSubAssemblyPicker && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Select Sub-Assemblies</h3>
                    <button onClick={() => setShowSubAssemblyPicker(false)} className="text-gray-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4 border-b border-gray-700">
                    <input
                      type="text"
                      value={subAssemblySearchQuery}
                      onChange={(e) => setSubAssemblySearchQuery(e.target.value)}
                      placeholder="Search sub-assemblies by ID, description, or category..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                      {subAssemblies
                        .filter(sub => {
                          if (!subAssemblySearchQuery) return true;
                          const query = subAssemblySearchQuery.toLowerCase();
                          return (
                            sub.subAssemblyId.toLowerCase().includes(query) ||
                            sub.description?.toLowerCase().includes(query) ||
                            sub.category?.toLowerCase().includes(query)
                          );
                        })
                        .map(sub => {
                          const isSelected = (template.subAssemblies || []).includes(sub.subAssemblyId);
                          return (
                            <button
                              key={sub.subAssemblyId}
                              onClick={() => {
                                const current = template.subAssemblies || [];
                                if (isSelected) {
                                  setTemplate({
                                    ...template,
                                    subAssemblies: current.filter(id => id !== sub.subAssemblyId)
                                  });
                                } else {
                                  setTemplate({
                                    ...template,
                                    subAssemblies: [...current, sub.subAssemblyId]
                                  });
                                }
                              }}
                              className={`w-full text-left p-3 rounded-md transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-mono text-sm">{sub.subAssemblyId}</p>
                                  <p className="text-xs opacity-80">{sub.description}</p>
                                  <p className="text-xs opacity-60 mt-1">{sub.category}</p>
                                </div>
                                {isSelected && <CheckCircle size={20} />}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button
                      onClick={() => setShowSubAssemblyPicker(false)}
                      className="px-4 py-2 bg-transparent text-white rounded-md border border-transparent hover:border-orange-500 hover:bg-transparent"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
