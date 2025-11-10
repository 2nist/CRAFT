import React, { useState, useEffect } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AssemblyIOBuilder = ({ assemblyToEdit, onSave, onClose }) => {
  const [ioPalette, setIoPalette] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [assembly, setAssembly] = useState(assemblyToEdit || {
    assemblyId: '',
    displayName: '',
    description: '',
    estimatedLaborHours: 0,
    fields: {
      digitalIn: [],
      digitalOut: [],
      analogIn: [],
      analogOut: []
    }
  });

  // Load I/O palette from default_io_fields.json
  useEffect(() => {
    const loadIOPalette = async () => {
      try {
        const response = await window.electronAPI?.readFile('src/data/schemas/default_io_fields.json');
        if (response) {
          setIoPalette(JSON.parse(response));
        }
      } catch (error) {
        console.error('Error loading I/O palette:', error);
      }
    };
    loadIOPalette();
  }, []);

  // Filter I/O palette based on search query
  const filteredPalette = Object.entries(ioPalette).reduce((acc, [section, fields]) => {
    acc[section] = fields.filter(field =>
      field.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return acc;
  }, {});

  // Add I/O field to assembly
  const addIOField = (section, fieldTemplate) => {
    const newField = {
      ...fieldTemplate,
      quantity: 1,
      // For Number type fields (Motors/Heaters), initialize parameter arrays
      ...(fieldTemplate.fieldType === 'Number' && { parameters: [0] })
    };

    setAssembly(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [section]: [...(prev.fields[section] || []), newField]
      }
    }));
  };

  // Update quantity for an I/O field
  const updateQuantity = (section, index, newQuantity) => {
    if (newQuantity < 1) return;

    setAssembly(prev => {
      const updatedFields = [...prev.fields[section]];
      const field = updatedFields[index];

      // For Number type fields, adjust parameter array size
      if (field.fieldType === 'Number') {
        const currentParams = field.parameters || [];
        const newParams = [...currentParams];

        if (newQuantity > currentParams.length) {
          // Add parameters
          while (newParams.length < newQuantity) {
            newParams.push(0);
          }
        } else if (newQuantity < currentParams.length) {
          // Remove parameters
          newParams.splice(newQuantity);
        }

        updatedFields[index] = { ...field, quantity: newQuantity, parameters: newParams };
      } else {
        updatedFields[index] = { ...field, quantity: newQuantity };
      }

      return {
        ...prev,
        fields: {
          ...prev.fields,
          [section]: updatedFields
        }
      };
    });
  };

  // Update parameter value for Number type fields
  const updateParameter = (section, fieldIndex, paramIndex, value) => {
    setAssembly(prev => {
      const updatedFields = [...prev.fields[section]];
      const field = updatedFields[fieldIndex];
      const updatedParams = [...(field.parameters || [])];
      updatedParams[paramIndex] = parseFloat(value) || 0;

      updatedFields[fieldIndex] = { ...field, parameters: updatedParams };

      return {
        ...prev,
        fields: {
          ...prev.fields,
          [section]: updatedFields
        }
      };
    });
  };

  // Remove I/O field from assembly
  const removeIOField = (section, index) => {
    setAssembly(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [section]: prev.fields[section].filter((_, i) => i !== index)
      }
    }));
  };

  // Get section display name
  const getSectionDisplayName = (section) => {
    const names = {
      digitalIn: 'Digital Inputs',
      digitalOut: 'Digital Outputs',
      analogIn: 'Analog Inputs',
      analogOut: 'Analog Outputs'
    };
    return names[section] || section;
  };

  // Get parameter label for Number type fields
  const getParameterLabel = (fieldName) => {
    if (fieldName.toLowerCase().includes('motor')) {
      return 'HP';
    } else if (fieldName.toLowerCase().includes('heater')) {
      return 'kW';
    }
    return 'Value';
  };

  const handleSave = () => {
    onSave(assembly);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Assembly I/O Builder</h2>
          <p className="text-sm text-slate-400">Build logical process assemblies with I/O points</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Assembly
          </Button>
        </div>
      </div>

      {/* Two-Pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: I/O Palette */}
        <div className="w-1/2 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">I/O Palette</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search I/O types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {Object.entries(filteredPalette).map(([section, fields]) => (
              <Card key={section} className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300">
                    {getSectionDisplayName(section)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-700">
                      <div className="flex-1">
                        <p className="text-sm text-white">{field.fieldName}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {field.fieldType}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addIOField(section, field)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No matching I/O types</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Pane: Assembly Container */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">Assembly Container</h3>
            <div className="space-y-3">
              <Input
                placeholder="Assembly ID (e.g., proc_acid_bath)"
                value={assembly.assemblyId}
                onChange={(e) => setAssembly(prev => ({ ...prev, assemblyId: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Input
                placeholder="Display Name (e.g., Acid Bath Process)"
                value={assembly.displayName}
                onChange={(e) => setAssembly(prev => ({ ...prev, displayName: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Input
                type="number"
                placeholder="Estimated Labor Hours"
                value={assembly.estimatedLaborHours || ''}
                onChange={(e) => setAssembly(prev => ({ ...prev, estimatedLaborHours: parseFloat(e.target.value) || 0 }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {Object.entries(assembly.fields).map(([section, fields]) => (
              <Card key={section} className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300">
                    {getSectionDisplayName(section)} ({fields.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={index} className="p-3 bg-slate-900 rounded border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{field.fieldName}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {field.fieldType}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeIOField(section, index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-xs text-slate-400">Quantity:</label>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(section, index, field.quantity - 1)}
                            disabled={field.quantity <= 1}
                            className="h-6 w-6 p-0"
                          >
                            -
                          </Button>
                          <span className="text-sm text-white min-w-[2rem] text-center">{field.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(section, index, field.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Parameters for Number type fields */}
                      {field.fieldType === 'Number' && field.parameters && (
                        <div className="space-y-2">
                          <label className="text-xs text-slate-400">
                            {getParameterLabel(field.fieldName)} Values:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {field.parameters.map((param, paramIndex) => (
                              <Input
                                key={paramIndex}
                                type="number"
                                step="0.1"
                                placeholder={`${getParameterLabel(field.fieldName)} ${paramIndex + 1}`}
                                value={param}
                                onChange={(e) => updateParameter(section, index, paramIndex, e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No I/O added yet. Select from the palette.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssemblyIOBuilder;