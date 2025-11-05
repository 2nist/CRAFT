import React, { useState, useEffect } from 'react';
import { FileCode, Plus, Edit, Save, X, AlertCircle, Loader, Trash2, Settings, Eye } from 'lucide-react';

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
  const [editingField, setEditingField] = useState(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [activeFieldSection, setActiveFieldSection] = useState('digitalIn');

  const IO_SECTIONS = ['DI', 'DO', 'AI', 'AO'];
  const SECTION_MAP = {
    'DI': 'digitalIn',
    'DO': 'digitalOut',
    'AI': 'analogIn',
    'AO': 'analogOut'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [products, assembliesData] = await Promise.all([
        window.schemas.getProduct(),
        window.assemblies.getAll()
      ]);
      
      // Products is now a simple array of { const, description }
      setProductSchema(products || []);
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
        // Convert new format to old format for editing
        const convertedTemplate = {
          productCode: existingTemplate.productCode,
          productName: existingTemplate.productName,
          availableSections: [],
          defaultAssemblies: existingTemplate.assemblies?.recommended || [],
          requiredAssemblies: existingTemplate.assemblies?.required || [],
          optionalAssemblies: existingTemplate.assemblies?.optional || [],
          estimatedBaseLaborHours: existingTemplate.estimatedBaseLaborHours || 0,
          notes: existingTemplate.notes || '',
          prePopulatedFields: existingTemplate.fields || { digitalIn: [], digitalOut: [], analogIn: [], analogOut: [] }
        };
        
        // Determine which sections are available based on fields
        if (existingTemplate.fields?.digitalIn?.length > 0) convertedTemplate.availableSections.push('DI');
        if (existingTemplate.fields?.digitalOut?.length > 0) convertedTemplate.availableSections.push('DO');
        if (existingTemplate.fields?.analogIn?.length > 0) convertedTemplate.availableSections.push('AI');
        if (existingTemplate.fields?.analogOut?.length > 0) convertedTemplate.availableSections.push('AO');
        
        setTemplate(convertedTemplate);
      } else {
        // Create new template with default IO fields "starter pack"
        const defaultFields = await window.schemas.getDefaultIoFields();
        const product = productSchema.find(p => p.const === productCode);
        
        setTemplate({
          productCode: productCode,
          productName: product?.description || '',
          availableSections: ['DI', 'DO', 'AI', 'AO'],
          defaultAssemblies: [],
          requiredAssemblies: [],
          optionalAssemblies: [],
          estimatedBaseLaborHours: 0,
          notes: '',
          prePopulatedFields: defaultFields // Store default fields for later use
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

      // Convert old format to new format for saving
      const sectionToFieldMap = {
        'DI': 'digitalIn',
        'DO': 'digitalOut',
        'AI': 'analogIn',
        'AO': 'analogOut'
      };
      
      const newTemplate = {
        productCode: template.productCode,
        productName: template.productName,
        fields: {},
        assemblies: {
          required: template.requiredAssemblies || [],
          recommended: template.defaultAssemblies || [],
          optional: template.optionalAssemblies || []
        },
        estimatedBaseLaborHours: template.estimatedBaseLaborHours || 0,
        notes: template.notes || ''
      };
      
      // Use prePopulatedFields for all fields (both new and existing templates)
      newTemplate.fields = template.prePopulatedFields || {
        digitalIn: [],
        digitalOut: [],
        analogIn: [],
        analogOut: []
      };

      const result = await window.productTemplates.save(newTemplate);
      
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

  const handleBack = () => {
    setIsEditing(false);
    setSelectedProductCode(null);
    setTemplate(null);
    setError(null);
    setSuccess(null);
    setShowFieldEditor(false);
    setEditingField(null);
  };

  // Field management functions
  const handleAddField = (section) => {
    setActiveFieldSection(section);
    setEditingField({
      fieldName: '',
      fieldType: 'Boolean',
      listOptions: [],
      bomLogic: { category: '', type: '' }
    });
    setShowFieldEditor(true);
  };

  const handleEditField = (section, fieldIndex) => {
    const sectionKey = SECTION_MAP[section];
    const field = template.prePopulatedFields?.[sectionKey]?.[fieldIndex];
    if (field) {
      setActiveFieldSection(sectionKey);
      setEditingField({ ...field, _index: fieldIndex });
      setShowFieldEditor(true);
    }
  };

  const handleSaveField = () => {
    if (!editingField.fieldName.trim()) {
      setError('Field name is required');
      return;
    }

    const fields = { ...template.prePopulatedFields } || {
      digitalIn: [],
      digitalOut: [],
      analogIn: [],
      analogOut: []
    };

    if (editingField._index !== undefined) {
      // Edit existing field
      fields[activeFieldSection][editingField._index] = {
        fieldName: editingField.fieldName,
        fieldType: editingField.fieldType,
        listOptions: editingField.listOptions || [],
        bomLogic: editingField.bomLogic || {}
      };
    } else {
      // Add new field
      if (!fields[activeFieldSection]) fields[activeFieldSection] = [];
      fields[activeFieldSection].push({
        fieldName: editingField.fieldName,
        fieldType: editingField.fieldType,
        listOptions: editingField.listOptions || [],
        bomLogic: editingField.bomLogic || {}
      });
    }

    setTemplate({ ...template, prePopulatedFields: fields });
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (section, fieldIndex) => {
    const sectionKey = SECTION_MAP[section];
    const fields = { ...template.prePopulatedFields };
    if (fields[sectionKey]) {
      fields[sectionKey].splice(fieldIndex, 1);
      setTemplate({ ...template, prePopulatedFields: fields });
    }
  };

  const handleAddListOption = () => {
    const newOption = {
      value: '',
      label: '',
      bomLogic: { category: '', type: '' }
    };
    setEditingField({
      ...editingField,
      listOptions: [...(editingField.listOptions || []), newOption]
    });
  };

  const handleUpdateListOption = (index, field, value) => {
    const options = [...editingField.listOptions];
    if (field.includes('.')) {
      // Nested field (bomLogic)
      const [parent, child] = field.split('.');
      options[index][parent] = { ...options[index][parent], [child]: value };
    } else {
      options[index][field] = value;
    }
    setEditingField({ ...editingField, listOptions: options });
  };

  const handleRemoveListOption = (index) => {
    const options = [...editingField.listOptions];
    options.splice(index, 1);
    setEditingField({ ...editingField, listOptions: options });
  };

  const handleLoadDefaultFields = async () => {
    try {
      const defaultFields = await window.schemas.getDefaultIoFields();
      
      // Merge with existing fields or replace entirely
      const confirmReplace = window.confirm(
        'Load default I/O fields?\n\n' +
        'MERGE: Adds default fields to existing fields\n' +
        'REPLACE: Removes all current fields and loads defaults\n\n' +
        'Click OK to MERGE, Cancel to REPLACE'
      );

      if (confirmReplace) {
        // MERGE: Combine existing with defaults (avoid duplicates)
        const mergedFields = { ...template.prePopulatedFields };
        
        ['digitalIn', 'digitalOut', 'analogIn', 'analogOut'].forEach(section => {
          const existing = mergedFields[section] || [];
          const defaults = defaultFields[section] || [];
          
          // Only add defaults that don't already exist (by fieldName)
          const existingNames = existing.map(f => f.fieldName);
          const newDefaults = defaults.filter(df => !existingNames.includes(df.fieldName));
          
          mergedFields[section] = [...existing, ...newDefaults];
        });
        
        setTemplate({ ...template, prePopulatedFields: mergedFields });
        setSuccess('Default I/O fields merged successfully!');
      } else {
        // REPLACE: Use defaults entirely
        setTemplate({ ...template, prePopulatedFields: defaultFields });
        setSuccess('Default I/O fields loaded successfully!');
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to load default fields:', err);
      setError(`Failed to load default fields: ${err.message}`);
    }
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
              </div>

              {/* I/O Field Editor */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">I/O Field Configuration</h3>
                  <button
                    onClick={handleLoadDefaultFields}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                    title="Load pre-configured I/O fields from default_io_fields.json"
                  >
                    <FileCode size={16} />
                    Load Default Fields
                  </button>
                </div>

                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-md">
                  <p className="text-xs text-blue-300">
                    These fields will appear in the Quote Configurator when this product is selected.
                    Configure field types, dropdown options, and BOM logic for automatic assembly selection.
                  </p>
                </div>

                {/* Field Tabs */}
                <div className="flex gap-2 mb-4 border-b border-gray-700">
                  {['digitalIn', 'digitalOut', 'analogIn', 'analogOut'].map(section => {
                    const label = section === 'digitalIn' ? 'Digital IN' :
                                 section === 'digitalOut' ? 'Digital OUT' :
                                 section === 'analogIn' ? 'Analog IN' : 'Analog OUT';
                    const count = template.prePopulatedFields?.[section]?.length || 0;
                    
                    return (
                      <button
                        key={section}
                        onClick={() => setActiveFieldSection(section)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          activeFieldSection === section
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Field List */}
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {template.prePopulatedFields?.[activeFieldSection]?.map((field, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md hover:bg-gray-700">
                      <div className="flex-1">
                        <p className="font-medium text-white">{field.fieldName}</p>
                        <p className="text-xs text-gray-400">
                          Type: {field.fieldType}
                          {field.listOptions?.length > 0 && ` • ${field.listOptions.length} options`}
                          {field.bomLogic?.category && ` • BOM: ${field.bomLogic.category}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditField(IO_SECTIONS[['digitalIn', 'digitalOut', 'analogIn', 'analogOut'].indexOf(activeFieldSection)], index)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded"
                          title="Edit field"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteField(IO_SECTIONS[['digitalIn', 'digitalOut', 'analogIn', 'analogOut'].indexOf(activeFieldSection)], index)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded"
                          title="Delete field"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-gray-500 py-4">No fields configured for this section</p>
                  )}
                </div>

                <button
                  onClick={() => handleAddField(IO_SECTIONS[['digitalIn', 'digitalOut', 'analogIn', 'analogOut'].indexOf(activeFieldSection)])}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md border border-gray-600 hover:border-gray-500"
                >
                  <Plus size={16} />
                  Add Field to {activeFieldSection === 'digitalIn' ? 'Digital IN' :
                               activeFieldSection === 'digitalOut' ? 'Digital OUT' :
                               activeFieldSection === 'analogIn' ? 'Analog IN' : 'Analog OUT'}
                </button>
              </div>

              {/* Field Editor Modal */}
              {showFieldEditor && editingField && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">
                        {editingField._index !== undefined ? 'Edit' : 'Add'} Field
                      </h3>
                      <button
                        onClick={() => { setShowFieldEditor(false); setEditingField(null); }}
                        className="text-gray-400 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Field Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Field Name *
                        </label>
                        <input
                          type="text"
                          value={editingField.fieldName}
                          onChange={(e) => setEditingField({ ...editingField, fieldName: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Motor Control, Level Sensor"
                        />
                      </div>

                      {/* Field Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Field Type *
                        </label>
                        <select
                          value={editingField.fieldType}
                          onChange={(e) => setEditingField({ ...editingField, fieldType: e.target.value, listOptions: e.target.value === 'List' ? editingField.listOptions || [] : [] })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Boolean">Boolean (Yes/No Checkbox)</option>
                          <option value="Number">Number</option>
                          <option value="Text">Text</option>
                          <option value="List">List (Dropdown)</option>
                        </select>
                      </div>

                      {/* BOM Logic */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          BOM Logic (Optional)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingField.bomLogic?.category || ''}
                            onChange={(e) => setEditingField({ ...editingField, bomLogic: { ...editingField.bomLogic, category: e.target.value } })}
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Category (e.g., MOTOR CONTROL)"
                          />
                          <input
                            type="text"
                            value={editingField.bomLogic?.type || ''}
                            onChange={(e) => setEditingField({ ...editingField, bomLogic: { ...editingField.bomLogic, type: e.target.value } })}
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type (e.g., VFD)"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Used to automatically find matching assemblies in BOM generation
                        </p>
                      </div>

                      {/* List Options (only for List type) */}
                      {editingField.fieldType === 'List' && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-400">
                              Dropdown Options
                            </label>
                            <button
                              onClick={handleAddListOption}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                            >
                              <Plus size={14} />
                              Add Option
                            </button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {editingField.listOptions?.map((option, index) => (
                              <div key={index} className="p-3 bg-gray-700/50 rounded border border-gray-600">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <input
                                    type="text"
                                    value={option.value || ''}
                                    onChange={(e) => handleUpdateListOption(index, 'value', e.target.value)}
                                    className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                                    placeholder="Value"
                                  />
                                  <input
                                    type="text"
                                    value={option.label || ''}
                                    onChange={(e) => handleUpdateListOption(index, 'label', e.target.value)}
                                    className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                                    placeholder="Label"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={option.bomLogic?.category || ''}
                                    onChange={(e) => handleUpdateListOption(index, 'bomLogic.category', e.target.value)}
                                    className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                                    placeholder="BOM Category"
                                  />
                                  <input
                                    type="text"
                                    value={option.bomLogic?.type || ''}
                                    onChange={(e) => handleUpdateListOption(index, 'bomLogic.type', e.target.value)}
                                    className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
                                    placeholder="BOM Type"
                                  />
                                  <button
                                    onClick={() => handleRemoveListOption(index)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )) || <p className="text-xs text-gray-500 text-center py-2">No options added</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-end gap-3">
                      <button
                        onClick={() => { setShowFieldEditor(false); setEditingField(null); }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveField}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                      >
                        Save Field
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

              {/* Field Preview */}
              {template.prePopulatedFields && Object.values(template.prePopulatedFields).some(arr => arr?.length > 0) && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Eye size={20} />
                    Field Preview
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    This shows how the configured fields will appear in the Quote Configurator
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['digitalIn', 'digitalOut', 'analogIn', 'analogOut'].map(section => {
                      const fields = template.prePopulatedFields?.[section];
                      if (!fields || fields.length === 0) return null;
                      
                      const sectionLabel = section === 'digitalIn' ? 'Digital Inputs' :
                                          section === 'digitalOut' ? 'Digital Outputs' :
                                          section === 'analogIn' ? 'Analog Inputs' :
                                          'Analog Outputs';
                      
                      return (
                        <div key={section} className="space-y-3">
                          <h4 className="font-medium text-blue-400 text-sm uppercase tracking-wide border-b border-gray-700 pb-2">
                            {sectionLabel}
                          </h4>
                          {fields.map((field, index) => (
                            <div key={index} className="bg-gray-700/30 p-3 rounded-md">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                {field.fieldName}
                                {field.bomLogic?.category && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({field.bomLogic.category})
                                  </span>
                                )}
                              </label>
                              {field.fieldType === 'Boolean' && (
                                <input
                                  type="checkbox"
                                  disabled
                                  className="rounded opacity-50"
                                />
                              )}
                              {field.fieldType === 'Number' && (
                                <input
                                  type="number"
                                  disabled
                                  placeholder="0"
                                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm opacity-50"
                                />
                              )}
                              {field.fieldType === 'Text' && (
                                <input
                                  type="text"
                                  disabled
                                  placeholder="Enter text..."
                                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm opacity-50"
                                />
                              )}
                              {field.fieldType === 'List' && (
                                <select
                                  disabled
                                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm opacity-50"
                                >
                                  <option>Select...</option>
                                  {field.listOptions?.map((opt, i) => (
                                    <option key={i} value={opt.value}>
                                      {opt.label || opt.value}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
