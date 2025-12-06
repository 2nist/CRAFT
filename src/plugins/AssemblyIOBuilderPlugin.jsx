import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search } from 'lucide-react';
import AssemblyIOBuilder from '@/components/AssemblyIOBuilder';

/**
 * AssemblyIOBuilderPlugin
 * 
 * A plugin wrapper for the AssemblyIOBuilder component that provides:
 * - Assembly library management (list, create, edit, delete)
 * - I/O field configuration UI
 * - Save/load assemblies from JSON files
 */
export default function AssemblyIOBuilderPlugin({ context, onNavigate }) {
  const [assemblies, setAssemblies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load assemblies from JSON file
  useEffect(() => {
    loadAssemblies();
  }, []);

  const loadAssemblies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/craft-cpq/src/data/assemblies/assemblies.json');
      if (response.ok) {
        const data = await response.json();
        setAssemblies(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading assemblies:', err);
      setError('Failed to load assemblies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewAssembly = () => {
    setEditingAssembly(null);
    setShowEditor(true);
  };

  const handleEditAssembly = (assembly) => {
    setEditingAssembly(assembly);
    setShowEditor(true);
  };

  const handleSaveAssembly = (assembly) => {
    try {
      const existingIndex = assemblies.findIndex(a => a.assemblyId === assembly.assemblyId);
      
      let updatedAssemblies;
      if (existingIndex >= 0) {
        // Update existing
        updatedAssemblies = [...assemblies];
        updatedAssemblies[existingIndex] = assembly;
        setSuccess(`Assembly "${assembly.displayName}" updated successfully`);
      } else {
        // Create new
        updatedAssemblies = [...assemblies, assembly];
        setSuccess(`Assembly "${assembly.displayName}" created successfully`);
      }

      setAssemblies(updatedAssemblies);
      saveAssembliesToFile(updatedAssemblies);
      setShowEditor(false);
      setEditingAssembly(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving assembly:', err);
      setError('Failed to save assembly');
    }
  };

  const handleDeleteAssembly = (assemblyId) => {
    if (window.confirm('Are you sure you want to delete this assembly?')) {
      const updatedAssemblies = assemblies.filter(a => a.assemblyId !== assemblyId);
      setAssemblies(updatedAssemblies);
      saveAssembliesToFile(updatedAssemblies);
      setSuccess('Assembly deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const saveAssembliesToFile = async (data) => {
    try {
      // This would need backend support to write to file
      console.log('Would save assemblies:', data);
      // For now, just log - in a real app, you'd call an IPC handler or API endpoint
    } catch (err) {
      console.error('Error saving to file:', err);
    }
  };

  // Filter assemblies based on search
  const filteredAssemblies = assemblies.filter(assembly =>
    assembly.assemblyId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showEditor) {
    return (
      <AssemblyIOBuilder
        assemblyToEdit={editingAssembly}
        onSave={handleSaveAssembly}
        onClose={() => {
          setShowEditor(false);
          setEditingAssembly(null);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Assembly I/O Builder</h1>
            <p className="text-sm text-slate-400 mt-1">
              Create and manage assemblies with digital/analog I/O configuration
            </p>
          </div>
          <button
            onClick={handleNewAssembly}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Assembly
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search assemblies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
            {success}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-slate-400">Loading assemblies...</p>
            </div>
          </div>
        ) : filteredAssemblies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-slate-400 text-lg mb-4">
                {searchTerm ? 'No assemblies match your search' : 'No assemblies yet. Create one to get started!'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleNewAssembly}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Plus size={18} />
                  Create First Assembly
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssemblies.map((assembly) => (
              <div
                key={assembly.assemblyId}
                className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {assembly.displayName || assembly.assemblyId}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{assembly.assemblyId}</p>
                </div>

                <p className="text-sm text-slate-300 mb-4 line-clamp-2">
                  {assembly.description || 'No description'}
                </p>

                {/* I/O Summary */}
                <div className="mb-4 space-y-1 text-xs text-slate-400">
                  {assembly.fields?.digitalIn?.length > 0 && (
                    <div>DI: <span className="text-blue-400">{assembly.fields.digitalIn.length}</span></div>
                  )}
                  {assembly.fields?.digitalOut?.length > 0 && (
                    <div>DO: <span className="text-green-400">{assembly.fields.digitalOut.length}</span></div>
                  )}
                  {assembly.fields?.analogIn?.length > 0 && (
                    <div>AI: <span className="text-yellow-400">{assembly.fields.analogIn.length}</span></div>
                  )}
                  {assembly.fields?.analogOut?.length > 0 && (
                    <div>AO: <span className="text-purple-400">{assembly.fields.analogOut.length}</span></div>
                  )}
                </div>

                {assembly.estimatedLaborHours > 0 && (
                  <div className="mb-4 text-xs text-slate-400">
                    Labor: <span className="text-slate-300">{assembly.estimatedLaborHours}h</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAssembly(assembly)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAssembly(assembly.assemblyId)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
