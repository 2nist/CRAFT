# Product Template Manager - Simple Mode Implementation

## Overview
Add "Simple Mode" to Product Template Manager V2 that allows users to create templates by selecting existing Assembly IDs and Sub-Assembly IDs from searchable lists, without defining custom fields inline.

## Required Changes

### 1. State Management (Already Added)
```javascript
const [templateMode, setTemplateMode] = useState('simple'); // 'simple' or 'advanced'
const [showAssemblyPicker, setShowAssemblyPicker] = useState(false);
const [showSubAssemblyPicker, setShowSubAssemblyPicker] = useState(false);
const [assemblySearchQuery, setAssemblySearchQuery] = useState('');
const [subAssemblySearchQuery, setSubAssemblySearchQuery] = useState('');
```

### 2. Data Structure - Simple Mode
When in simple mode, templates use this structure:
```json
{
  "productCode": 100,
  "productName": "Brewhouse Control Panel",
  "notes": "...",
  "estimatedBaseLaborHours": 40,
  "assemblies": ["PROC_BREW_KETTLE", "PROC_HLT", "PROC_MASH_TUN"],
  "subAssemblies": ["SA-VFD-1.5HP", "SA-PUMP-1HP", "KIT-MAIN-PANEL-LARGE"]
}
```

### 3. UI Components to Add

#### A. Mode Toggle (after Basic Information section)
```jsx
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
        className={`px-4 py-2 rounded-md transition-colors ${
          templateMode === 'simple' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Simple Mode
      </button>
      <button
        onClick={() => setTemplateMode('advanced')}
        className={`px-4 py-2 rounded-md transition-colors ${
          templateMode === 'advanced' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Advanced Mode
      </button>
    </div>
  </div>
</div>
```

#### B. Simple Mode - Assembly References
```jsx
{templateMode === 'simple' && (
  <>
    {/* Assembly IDs */}
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Assembly References</h3>
          <p className="text-sm text-gray-400">Select existing assemblies from your library</p>
        </div>
        <button
          onClick={() => setShowAssemblyPicker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          <Plus size={18} />
          Add Assembly Reference
        </button>
      </div>

      <div className="space-y-2">
        {(template.assemblies || []).map((assemblyId, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
            <span className="text-white font-mono">{assemblyId}</span>
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
        ))}
        {(!template.assemblies || template.assemblies.length === 0) && (
          <p className="text-center text-gray-500 py-4">No assemblies added yet</p>
        )}
      </div>
    </div>

    {/* Sub-Assembly IDs */}
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Sub-Assembly References</h3>
          <p className="text-sm text-gray-400">Select base kits/sub-assemblies</p>
        </div>
        <button
          onClick={() => setShowSubAssemblyPicker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
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
```

#### C. Assembly Picker Modal
```jsx
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
```

#### D. Sub-Assembly Picker Modal (with Search)
```jsx
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}
```

### 4. Template Initialization Update
```javascript
const handleSelectProduct = async (productCode) => {
  try {
    setError(null);
    setSuccess(null);
    setSelectedProductCode(productCode);
    
    const existingTemplate = await window.productTemplates.get(productCode);
    
    if (existingTemplate) {
      setTemplate(existingTemplate);
      // Auto-detect mode based on structure
      if (Array.isArray(existingTemplate.assemblies) && 
          existingTemplate.assemblies.length > 0 &&
          typeof existingTemplate.assemblies[0] === 'string') {
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
```

### 5. Save Handler Update
```javascript
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
```

## Schema Updates Needed

Update `product_template_schema.json` to support both modes:
- `assemblies` can be either an array of strings (simple) or array of objects (advanced)
- Add optional `subAssemblies` array at template level for simple mode

## Benefits
1. **Quick Setup**: Users can create templates in minutes by referencing existing work
2. **Reusability**: Leverage existing assemblies and sub-assemblies
3. **Searchable**: Find assemblies/sub-assemblies quickly
4. **Flexible**: Switch between simple and advanced modes as needed
5. **Migration Path**: Existing advanced templates still work

## Next Steps
1. Implement UI components in ProductTemplateManagerV2.jsx
2. Update schema to support dual-mode
3. Test with both simple and advanced templates
4. Add Assembly Manager integration for assembly picker
