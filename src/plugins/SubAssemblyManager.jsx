import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Search, Save, X, AlertCircle, Loader, RotateCcw } from 'lucide-react';

export default function SubAssemblyManager({ context, onNavigate }) {
  const [subAssemblies, setSubAssemblies] = useState([]);
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubAssembly, setEditingSubAssembly] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [componentSearchTerm, setComponentSearchTerm] = useState('');
  const [showComponentSearch, setShowComponentSearch] = useState(null); // index of component being searched

  const CATEGORIES = [
    "ENCLOSURE",
    "DISCONNECT",
    "FUSE",
    "BRANCH BREAKER",
    "PWRDST",
    "CONTROL",
    "SAFETY",
    "PLC/COM",
    "MOTOR CONTROL/HEATER CONTROL",
    "WIRING",
    "INSTRUMENT",
    "PNU",
    "Uncategorized"
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subAssemblyData, componentsData, categoriesData] = await Promise.all([
        window.subAssemblies.getAll(),
        window.components.getAll(),
        window.subAssemblies.getCategories()
      ]);
      setSubAssemblies(subAssemblyData || []);
      setComponents(componentsData || []);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingSubAssembly({
      subAssemblyId: '', // v2.0: Use subAssemblyId for new sub-assemblies
      assemblyId: '', // Keep for backward compatibility
      description: '',
      category: '',
      components: [],
      estimatedLaborHours: 0
    });
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (subAssembly) => {
    setEditingSubAssembly(JSON.parse(JSON.stringify(subAssembly))); // Deep clone
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      // Validate required fields
      // Support both subAssemblyId (new) and assemblyId (legacy)
      const subAssemblyId = editingSubAssembly.subAssemblyId || editingSubAssembly.assemblyId;
      if (!subAssemblyId || !editingSubAssembly.description || !editingSubAssembly.category) {
        setError('Sub-Assembly ID, Description, and Category are required');
        return;
      }
      
      // Ensure subAssemblyId is set (for schema validation)
      if (!editingSubAssembly.subAssemblyId && editingSubAssembly.assemblyId) {
        editingSubAssembly.subAssemblyId = editingSubAssembly.assemblyId;
      }

      if (editingSubAssembly.components.length === 0) {
        setError('At least one component is required');
        return;
      }

      const result = await window.subAssemblies.save(editingSubAssembly);
      
      if (result.success) {
        const savedId = editingSubAssembly.subAssemblyId || editingSubAssembly.assemblyId;
        setSuccess(`Sub-Assembly "${savedId}" saved successfully`);
        setIsEditing(false);
        setEditingSubAssembly(null);
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Validation failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (err) {
      console.error('Failed to save sub-assembly:', err);
      setError(`Failed to save: ${err.message}`);
    }
  };

  const handleDelete = async (subAssemblyId) => {
    if (!confirm(`Are you sure you want to delete sub-assembly "${subAssemblyId}"?`)) {
      return;
    }

    try {
      setError(null);
      const result = await window.subAssemblies.delete(subAssemblyId);
      
      if (result.success) {
        setSuccess(`Sub-Assembly "${subAssemblyId}" deleted successfully`);
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to delete sub-assembly');
      }
    } catch (err) {
      console.error('Failed to delete sub-assembly:', err);
      setError(`Failed to delete: ${err.message}`);
    }
  };

  const handleAddComponent = () => {
    const newComponent = {
      sku: '',
      quantity: 1,
      notes: ''
    };
    setEditingSubAssembly({
      ...editingSubAssembly,
      components: [...editingSubAssembly.components, newComponent]
    });
  };

  const handleSelectComponent = (index, component) => {
    const updatedComponents = [...editingSubAssembly.components];
    updatedComponents[index] = {
      ...updatedComponents[index],
      sku: component.sku
    };
    setEditingSubAssembly({
      ...editingSubAssembly,
      components: updatedComponents
    });
    setShowComponentSearch(null);
    setComponentSearchTerm('');
  };

  const getFilteredComponents = () => {
    if (!componentSearchTerm) return components.slice(0, 50);
    
    const term = componentSearchTerm.toLowerCase();
    return components.filter(c => 
      c.sku?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term) ||
      c.quantity?.toString().includes(term)
    ).slice(0, 50);
  };

  const handleUpdateComponent = (index, field, value) => {
    const updatedComponents = [...editingSubAssembly.components];
    updatedComponents[index] = {
      ...updatedComponents[index],
      [field]: field === 'quantity' ? parseInt(value) || 1 : value
    };
    setEditingSubAssembly({
      ...editingSubAssembly,
      components: updatedComponents
    });
  };

  const handleRemoveComponent = (index) => {
    setEditingSubAssembly({
      ...editingSubAssembly,
      components: editingSubAssembly.components.filter((_, i) => i !== index)
    });
  };

  const filteredSubAssemblies = subAssemblies.filter(subAssembly => {
    // Support both assemblyId (legacy) and subAssemblyId (new) for search
    const assemblyId = (subAssembly.subAssemblyId || subAssembly.assemblyId || '').toLowerCase();
    const matchesSearch = !searchTerm || 
      assemblyId.includes(searchTerm.toLowerCase()) ||
      subAssembly.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || subAssembly.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Helper to check if sub-assembly is user-created (can be deleted)
  const isUserCreated = (subAssembly) => {
    return subAssembly.isUserCreated === true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-primary" size={32} />
        <span className="ml-3 text-muted-foreground">Loading sub-assemblies...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Sub-Assembly Manager</h1>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              title="Refresh sub-assemblies"
            >
              <RotateCcw size={18} />
              Refresh
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 transition-colors"
            >
              <Plus size={18} />
              New Sub-Assembly
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-destructive font-semibold">Error</p>
              <p className="text-destructive/80 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80">
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-success flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-success font-semibold">Success</p>
              <p className="text-success/80 text-sm">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-success hover:text-success/80">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Editor Modal */}
        {isEditing && editingSubAssembly && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
                <h2 className="text-2xl font-bold text-foreground">
                  {(editingSubAssembly.subAssemblyId || editingSubAssembly.assemblyId) ? 'Edit Sub-Assembly' : 'New Sub-Assembly'}
                </h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Sub-Assembly ID *
                    </label>
                    <input
                      type="text"
                      value={editingSubAssembly.subAssemblyId || editingSubAssembly.assemblyId || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditingSubAssembly({ 
                          ...editingSubAssembly, 
                          subAssemblyId: value, // v2.0: Use subAssemblyId
                          assemblyId: value // Keep for backward compatibility
                        });
                      }}
                      placeholder="e.g., ASM-VFD-1.5HP"
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Category *
                    </label>
                    <select
                      value={editingSubAssembly.category}
                      onChange={(e) => setEditingSubAssembly({ ...editingSubAssembly, category: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={editingSubAssembly.description}
                      onChange={(e) => setEditingSubAssembly({ ...editingSubAssembly, description: e.target.value })}
                      placeholder="e.g., 1.5HP VFD Starter Kit"
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Estimated Labor Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingSubAssembly.estimatedLaborHours || 0}
                      onChange={(e) => setEditingSubAssembly({ ...editingSubAssembly, estimatedLaborHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Components */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-foreground">Components</h3>
                    <button
                      onClick={handleAddComponent}
                      className="flex items-center gap-2 px-3 py-1.5 bg-success text-success-foreground rounded-md hover:bg-success/80 text-sm"
                    >
                      <Plus size={16} />
                      Add Component
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingSubAssembly.components.map((comp, index) => {
                      const selectedComponent = components.find(c => c.sku === comp.sku);
                      return (
                      <div key={index} className="flex gap-3 items-start bg-muted/50 p-3 rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_100px_1fr] gap-3">
                          <div className="relative">
                            <label className="block text-xs text-muted-foreground mb-1">Description *</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={selectedComponent?.description || comp.sku}
                                onChange={(e) => handleUpdateComponent(index, 'sku', e.target.value)}
                                onFocus={() => setShowComponentSearch(index)}
                                placeholder="Search component..."
                                className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                readOnly
                              />
                              <button
                                onClick={() => setShowComponentSearch(showComponentSearch === index ? null : index)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <Search size={16} />
                              </button>
                            </div>
                            
                            {/* Component Search Dropdown */}
                            {showComponentSearch === index && (
                              <div className="absolute z-50 mt-1 w-full md:w-96 bg-card border border-border rounded-lg shadow-xl max-h-80 overflow-hidden">
                                {/* Search Input */}
                                <div className="p-2 border-b border-border sticky top-0 bg-card">
                                  <input
                                    type="text"
                                    value={componentSearchTerm}
                                    onChange={(e) => setComponentSearchTerm(e.target.value)}
                                    placeholder="Search by SKU, Description, or Qty..."
                                    className="w-full px-3 py-2 bg-background border border-input rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    autoFocus
                                  />
                                </div>
                                
                                {/* Results */}
                                <div className="overflow-y-auto max-h-64">
                                  {getFilteredComponents().map((component, cIndex) => (
                                    <button
                                      key={cIndex}
                                      onClick={() => handleSelectComponent(index, component)}
                                      className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border/50 transition-colors"
                                    >
                                      <div className="font-mono text-sm text-foreground">{component.sku}</div>
                                      <div className="text-xs text-muted-foreground truncate">{component.description}</div>
                                      {component.quantity && (
                                        <div className="text-xs text-primary mt-0.5">Qty: {component.quantity}</div>
                                      )}
                                    </button>
                                  ))}
                                  {getFilteredComponents().length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground text-sm">
                                      No components found
                                    </div>
                                  )}
                                </div>
                                
                                {/* Close button */}
                                <div className="p-2 border-t border-border bg-card">
                                  <button
                                    onClick={() => {
                                      setShowComponentSearch(null);
                                      setComponentSearchTerm('');
                                    }}
                                    className="w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              value={comp.quantity}
                              onChange={(e) => handleUpdateComponent(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                            <input
                              type="text"
                              value={comp.notes || ''}
                              onChange={(e) => handleUpdateComponent(index, 'notes', e.target.value)}
                              placeholder="Optional notes"
                              className="w-full px-2 py-1.5 bg-background border border-input rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveComponent(index)}
                          className="text-destructive hover:text-destructive/80 mt-5"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                    })}

                    {editingSubAssembly.components.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No components added yet. Click "Add Component" to get started.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80"
                >
                  <Save size={18} />
                  Save Sub-Assembly
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sub-assemblies..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Assemblies List */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">
              Sub-Assemblies ({filteredSubAssemblies.length})
            </h2>
          </div>

          {filteredSubAssemblies.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground mb-2">No sub-assemblies found</p>
              <p className="text-sm text-muted-foreground">Create your first sub-assembly to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSubAssemblies.map(subAssembly => {
                const subAssemblyId = subAssembly.subAssemblyId || subAssembly.assemblyId;
                return (
                <div key={subAssemblyId} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {subAssembly.description}
                        </h3>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/30">
                          {subAssembly.category}
                        </span>
                        {!isUserCreated(subAssembly) && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full" title="Bundled sub-assembly">
                            Bundled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 font-mono">{subAssemblyId}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{subAssembly.components.length} components</span>
                        {subAssembly.estimatedLaborHours > 0 && (
                          <span>{subAssembly.estimatedLaborHours} labor hours</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(subAssembly)}
                        className="p-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      {isUserCreated(subAssembly) ? (
                        <button
                          onClick={() => handleDelete(subAssemblyId)}
                          className="p-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <div className="p-2 text-muted-foreground cursor-not-allowed" title="Bundled sub-assembly cannot be deleted">
                          <Trash2 size={18} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
