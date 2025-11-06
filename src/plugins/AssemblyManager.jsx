import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Search, Save, X, AlertCircle, Loader, RotateCcw } from 'lucide-react';

export default function AssemblyManager({ context, onNavigate }) {
  const [assemblies, setAssemblies] = useState([]);
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState(null);
  const [expandedAssembly, setExpandedAssembly] = useState(null);
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
      const [assembliesData, componentsData, categoriesData] = await Promise.all([
        window.assemblies.getAll(),
        window.components.getAll(),
        window.assemblies.getCategories()
      ]);
      setAssemblies(assembliesData || []);
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
    setEditingAssembly({
      assemblyId: '',
      description: '',
      category: '',
      components: [],
      estimatedLaborHours: 0
    });
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (assembly) => {
    setEditingAssembly(JSON.parse(JSON.stringify(assembly))); // Deep clone
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!editingAssembly.assemblyId || !editingAssembly.description || !editingAssembly.category) {
        setError('Assembly ID, Description, and Category are required');
        return;
      }

      if (editingAssembly.components.length === 0) {
        setError('At least one component is required');
        return;
      }

      const result = await window.assemblies.save(editingAssembly);
      
      if (result.success) {
        setSuccess(`Assembly "${editingAssembly.assemblyId}" saved successfully`);
        setIsEditing(false);
        setEditingAssembly(null);
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Validation failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (err) {
      console.error('Failed to save assembly:', err);
      setError(`Failed to save: ${err.message}`);
    }
  };

  const handleDelete = async (assemblyId) => {
    if (!confirm(`Are you sure you want to delete assembly "${assemblyId}"?`)) {
      return;
    }

    try {
      await window.assemblies.delete(assemblyId);
      setSuccess(`Assembly "${assemblyId}" deleted successfully`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete assembly:', err);
      setError(`Failed to delete: ${err.message}`);
    }
  };

  const handleAddComponent = () => {
    const newComponent = {
      sku: '',
      quantity: 1,
      notes: ''
    };
    setEditingAssembly({
      ...editingAssembly,
      components: [...editingAssembly.components, newComponent]
    });
  };

  const handleSelectComponent = (index, component) => {
    const updatedComponents = [...editingAssembly.components];
    updatedComponents[index] = {
      ...updatedComponents[index],
      sku: component.sku
    };
    setEditingAssembly({
      ...editingAssembly,
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
    const updatedComponents = [...editingAssembly.components];
    updatedComponents[index] = {
      ...updatedComponents[index],
      [field]: field === 'quantity' ? parseInt(value) || 1 : value
    };
    setEditingAssembly({
      ...editingAssembly,
      components: updatedComponents
    });
  };

  const handleRemoveComponent = (index) => {
    setEditingAssembly({
      ...editingAssembly,
      components: editingAssembly.components.filter((_, i) => i !== index)
    });
  };

  const handleExpandAssembly = async (assemblyId) => {
    if (expandedAssembly === assemblyId) {
      setExpandedAssembly(null);
      return;
    }

    try {
      const expanded = await window.assemblies.expand(assemblyId);
      setExpandedAssembly(assemblyId);
    } catch (err) {
      console.error('Failed to expand assembly:', err);
      setError(`Failed to expand: ${err.message}`);
    }
  };

  const filteredAssemblies = assemblies.filter(assembly => {
    const matchesSearch = !searchTerm || 
      assembly.assemblyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assembly.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || assembly.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-500" size={32} />
        <span className="ml-3 text-gray-400">Loading assemblies...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Assembly Manager</h1>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              title="Refresh assemblies"
            >
              <RotateCcw size={18} />
              Refresh
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              New Assembly
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

        {/* Editor Modal */}
        {isEditing && editingAssembly && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                <h2 className="text-2xl font-bold text-white">
                  {editingAssembly.assemblyId ? 'Edit Assembly' : 'New Assembly'}
                </h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Assembly ID *
                    </label>
                    <input
                      type="text"
                      value={editingAssembly.assemblyId}
                      onChange={(e) => setEditingAssembly({ ...editingAssembly, assemblyId: e.target.value })}
                      placeholder="e.g., ASM-VFD-1.5HP"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Category *
                    </label>
                    <select
                      value={editingAssembly.category}
                      onChange={(e) => setEditingAssembly({ ...editingAssembly, category: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={editingAssembly.description}
                      onChange={(e) => setEditingAssembly({ ...editingAssembly, description: e.target.value })}
                      placeholder="e.g., 1.5HP VFD Starter Kit"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Estimated Labor Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingAssembly.estimatedLaborHours || 0}
                      onChange={(e) => setEditingAssembly({ ...editingAssembly, estimatedLaborHours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Components */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-white">Components</h3>
                    <button
                      onClick={handleAddComponent}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <Plus size={16} />
                      Add Component
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editingAssembly.components.map((comp, index) => {
                      const selectedComponent = components.find(c => c.sku === comp.sku);
                      return (
                      <div key={index} className="flex gap-3 items-start bg-gray-700/50 p-3 rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_100px_1fr] gap-3">
                          <div className="relative">
                            <label className="block text-xs text-gray-400 mb-1">Description *</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={selectedComponent?.description || comp.sku}
                                onChange={(e) => handleUpdateComponent(index, 'sku', e.target.value)}
                                onFocus={() => setShowComponentSearch(index)}
                                placeholder="Search component..."
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                readOnly
                              />
                              <button
                                onClick={() => setShowComponentSearch(showComponentSearch === index ? null : index)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                <Search size={16} />
                              </button>
                            </div>
                            
                            {/* Component Search Dropdown */}
                            {showComponentSearch === index && (
                              <div className="absolute z-50 mt-1 w-full md:w-96 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
                                {/* Search Input */}
                                <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-800">
                                  <input
                                    type="text"
                                    value={componentSearchTerm}
                                    onChange={(e) => setComponentSearchTerm(e.target.value)}
                                    placeholder="Search by SKU, Description, or Qty..."
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                </div>
                                
                                {/* Results */}
                                <div className="overflow-y-auto max-h-64">
                                  {getFilteredComponents().map((component, cIndex) => (
                                    <button
                                      key={cIndex}
                                      onClick={() => handleSelectComponent(index, component)}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 transition-colors"
                                    >
                                      <div className="font-mono text-sm text-white">{component.sku}</div>
                                      <div className="text-xs text-gray-400 truncate">{component.description}</div>
                                      {component.quantity && (
                                        <div className="text-xs text-blue-400 mt-0.5">Qty: {component.quantity}</div>
                                      )}
                                    </button>
                                  ))}
                                  {getFilteredComponents().length === 0 && (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                      No components found
                                    </div>
                                  )}
                                </div>
                                
                                {/* Close button */}
                                <div className="p-2 border-t border-gray-700 bg-gray-800">
                                  <button
                                    onClick={() => {
                                      setShowComponentSearch(null);
                                      setComponentSearchTerm('');
                                    }}
                                    className="w-full px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              value={comp.quantity}
                              onChange={(e) => handleUpdateComponent(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Notes</label>
                            <input
                              type="text"
                              value={comp.notes || ''}
                              onChange={(e) => handleUpdateComponent(index, 'notes', e.target.value)}
                              placeholder="Optional notes"
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveComponent(index)}
                          className="text-red-400 hover:text-red-300 mt-5"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                    })}

                    {editingAssembly.components.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No components added yet. Click "Add Component" to get started.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-gray-800">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Save size={18} />
                  Save Assembly
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assemblies..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Assemblies List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              Assemblies ({filteredAssemblies.length})
            </h2>
          </div>

          {filteredAssemblies.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400 mb-2">No assemblies found</p>
              <p className="text-sm text-gray-500">Create your first assembly to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredAssemblies.map(assembly => (
                <div key={assembly.assemblyId} className="p-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {assembly.description}
                        </h3>
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full border border-blue-700">
                          {assembly.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2 font-mono">{assembly.assemblyId}</p>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>{assembly.components.length} components</span>
                        {assembly.estimatedLaborHours > 0 && (
                          <span>{assembly.estimatedLaborHours} labor hours</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(assembly)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(assembly.assemblyId)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
