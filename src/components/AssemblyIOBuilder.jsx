import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * AssemblyIOBuilder Component
 * @param {Object} assemblyToEdit - Assembly to edit (null for new)
 * @param {Function} onSave - Callback when assembly is saved
 * @param {Function} onClose - Callback when editor is closed
 */
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slateish/30 p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Assembly I/O Builder</h2>
          <p className="mt-1 text-sm text-slateish">Build logical process assemblies with I/O points</p>
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
        <div className="w-1/2 flex flex-col border-r border-slateish/30">
          <div className="border-b border-slateish/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">I/O Palette</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slateish" />
              <Input
                placeholder="Search I/O types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slateish/30 bg-background text-foreground"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 space-y-4 p-4">
            {Object.entries(filteredPalette).map(([section, fields]) => (
              <Card key={section} className="border-slateish/30 bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slateish">
                    {getSectionDisplayName(section)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between rounded border border-slateish/30 bg-muted/50 p-2">
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{field.fieldName}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {field.fieldType}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addIOField(section, field)}
                        className="text-accent hover:text-accent/80"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <p className="py-4 text-center text-sm text-slateish">No matching I/O types</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Pane: Assembly Container */}
        <div className="w-1/2 flex flex-col">
          <div className="border-b border-slateish/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Assembly Container</h3>
            <div className="space-y-3">
              <Input
                placeholder="Assembly ID (e.g., proc_acid_bath)"
                value={assembly.assemblyId}
                onChange={(e) => setAssembly(prev => ({ ...prev, assemblyId: e.target.value }))}
                className="border-slateish/30 bg-background text-foreground"
              />
              <Input
                placeholder="Display Name (e.g., Acid Bath Process)"
                value={assembly.displayName}
                onChange={(e) => setAssembly(prev => ({ ...prev, displayName: e.target.value }))}
                className="border-slateish/30 bg-background text-foreground"
              />
              <Input
                type="number"
                placeholder="Estimated Labor Hours"
                value={assembly.estimatedLaborHours || ''}
                onChange={(e) => setAssembly(prev => ({ ...prev, estimatedLaborHours: parseFloat(e.target.value) || 0 }))}
                className="border-slateish/30 bg-background text-foreground"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 space-y-4 p-4">
            {Object.entries(assembly.fields).map(([section, fields]) => (
              <Card key={section} className="border-slateish/30 bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slateish">
                    {getSectionDisplayName(section)} ({fields.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={index} className="rounded border border-slateish/30 bg-muted/50 p-3">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{field.fieldName}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {field.fieldType}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeIOField(section, index)}
                          className="text-danger hover:text-danger/80"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      {/* Quantity Control */}
                      <div className="mb-2 flex items-center gap-2">
                        <label className="text-xs text-slateish">Quantity:</label>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(section, index, field.quantity - 1)}
                            disabled={field.quantity <= 1}
                            className="size-6 p-0"
                          >
                            -
                          </Button>
                          <span className="min-w-8 text-center text-sm text-foreground">{field.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(section, index, field.quantity + 1)}
                            className="size-6 p-0"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Parameters for Number type fields */}
                      {field.fieldType === 'Number' && field.parameters && (
                        <div className="space-y-2">
                          <label className="text-xs text-slateish">
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
                                className="h-8 bg-background text-sm text-foreground"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <p className="py-4 text-center text-sm text-slateish">
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

AssemblyIOBuilder.propTypes = {
  assemblyToEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default AssemblyIOBuilder;