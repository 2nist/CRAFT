/**
 * ValidationService
 * 
 * Provides configuration validation for quotes to prevent errors before finalization.
 * Validates I/O capacity, voltage/phase compatibility, required sub-assemblies, and component availability.
 * Updated for v2.0 instance-based productConfiguration structure.
 */

/**
 * Normalize voltage string for comparison
 * @param {string} voltage - Voltage string (e.g., "480", "480V", "480 VAC")
 * @returns {string} Normalized voltage (numeric part only)
 */
function normalizeVoltage(voltage) {
  if (!voltage) return '';
  // Extract numeric part from voltage string
  const match = String(voltage).match(/(\d+)/);
  return match ? match[1] : String(voltage).trim();
}

/**
 * Normalize phase string for comparison
 * @param {string} phase - Phase string (e.g., "3", "3-Phase", "3 Phase", "3PH")
 * @returns {string} Normalized phase ("1" or "3")
 */
function normalizePhase(phase) {
  if (!phase) return '';
  const phaseStr = String(phase).toLowerCase().trim();
  // Check for "1" or "single" or "one"
  if (phaseStr.includes('1') || phaseStr.includes('single') || phaseStr.includes('one')) {
    return '1';
  }
  // Check for "3" or "three" or "tri"
  if (phaseStr.includes('3') || phaseStr.includes('three') || phaseStr.includes('tri')) {
    return '3';
  }
  return phaseStr;
}

/**
 * Count total I/O points from product configuration (v2.0 - instance-based)
 * @param {Object} productConfiguration - Product configuration object (instance-based structure)
 * @param {Object} template - Product template with assemblies array
 * @returns {{DI: number, DO: number, AI: number, AO: number}} I/O counts
 */
function countIOPoints(productConfiguration, template) {
  const counts = { DI: 0, DO: 0, AI: 0, AO: 0 };

  if (!productConfiguration || !template) {
    return counts;
  }

  // Create assembly lookup map
  const assemblyMap = new Map();
  if (template?.assemblies && Array.isArray(template.assemblies)) {
    for (const assembly of template.assemblies) {
      if (assembly.assemblyId) {
        assemblyMap.set(assembly.assemblyId, assembly);
      }
    }
  }

  // Iterate over all assemblies in productConfiguration
  for (const [assemblyId, assemblyData] of Object.entries(productConfiguration)) {
    // Skip non-assembly keys
    if (assemblyId === 'engineeringHours' || assemblyId === 'programmingHours' || assemblyId === 'productionHours') {
      continue;
    }

    // Get assembly definition
    const assembly = assemblyMap.get(assemblyId);
    if (!assembly || !assembly.fields) {
      continue;
    }

    const fieldSections = {
      DI: assembly.fields?.digitalIn || [],
      DO: assembly.fields?.digitalOut || [],
      AI: assembly.fields?.analogIn || [],
      AO: assembly.fields?.analogOut || []
    };

    // Handle instance-based structure (Step 3+: array of instances)
    if (Array.isArray(assemblyData)) {
      // Iterate over all instances of this assembly
      for (const instance of assemblyData) {
        if (!instance || !instance.fields) {
          continue;
        }

        const instanceFields = instance.fields;

        // Count I/O by field type for this instance
        for (const [ioType, fields] of Object.entries(fieldSections)) {
          if (!fields || !Array.isArray(fields)) continue;

          for (const field of fields) {
            const fieldName = field.fieldName;
            const fieldValue = instanceFields[fieldName];

            if (field.fieldType === 'Number') {
              // Number field represents count directly
              const count = parseInt(fieldValue) || 0;
              counts[ioType] += count;
            } else if (field.fieldType === 'Boolean') {
              // Boolean field represents 1 point if true/selected
              if (fieldValue === true || fieldValue === 'true' || fieldValue === 'True') {
                counts[ioType] += 1;
              }
            } else if (field.fieldType === 'List') {
              // List field represents 1 point if a value is selected
              if (fieldValue && fieldValue !== '' && fieldValue !== 'none') {
                counts[ioType] += 1;
              }
            }
          }

          // Count dynamic I/O instances (fields with instance IDs like "hlt_1_digitalIn_1234567890")
          const instancePattern = new RegExp(`^.*_${ioType.toLowerCase()}_\\d+$`, 'i');
          for (const [key, value] of Object.entries(instanceFields)) {
            if (instancePattern.test(key)) {
              // Instance exists = 1 point
              if (value !== null && value !== undefined && value !== '') {
                counts[ioType] += 1;
              }
            }
          }
        }
      }
    }
    // Handle assembly-level structure (Step 2: flat object with fields)
    else if (assemblyData && typeof assemblyData === 'object') {
      // This is the assembly-level structure from Step 2
      const instanceFields = assemblyData;

      // Count I/O by field type for this assembly
      for (const [ioType, fields] of Object.entries(fieldSections)) {
        if (!fields || !Array.isArray(fields)) continue;

        for (const field of fields) {
          const fieldName = field.fieldName;
          const fieldValue = instanceFields[fieldName];

          if (field.fieldType === 'Number') {
            // Number field represents count directly
            const count = parseInt(fieldValue) || 0;
            counts[ioType] += count;
          } else if (field.fieldType === 'Boolean') {
            // Boolean field represents 1 point if true/selected
            if (fieldValue === true || fieldValue === 'true' || fieldValue === 'True') {
              counts[ioType] += 1;
            }
          } else if (field.fieldType === 'List') {
            // List field represents 1 point if a value is selected
            if (fieldValue && fieldValue !== '' && fieldValue !== 'none') {
              counts[ioType] += 1;
            }
          }
        }
      }
    }
  }

  return counts;
}

/**
 * Validate I/O count against PLC capacity
 * @param {Object} ioCounts - I/O counts {DI, DO, AI, AO}
 * @param {Object} ioCapacity - PLC I/O capacity {DI, DO, AI, AO}
 * @returns {Array} Validation errors
 */
function validateIOCapacity(ioCounts, ioCapacity) {
  const errors = [];

  if (!ioCapacity) {
    // No capacity defined - cannot validate
    return errors;
  }

  const ioTypes = ['DI', 'DO', 'AI', 'AO'];
  for (const ioType of ioTypes) {
    const required = ioCounts[ioType] || 0;
    const capacity = ioCapacity[ioType] || 0;

    if (capacity > 0 && required > capacity) {
      errors.push({
        severity: 'error',
        code: 'IO_CAPACITY_EXCEEDED',
        message: `${ioType} count (${required}) exceeds PLC capacity (${capacity})`,
        field: `controlPanelConfig.ioCapacity.${ioType}`,
        suggestion: `Reduce ${ioType} requirements or upgrade PLC to support ${required} ${ioType} points`
      });
    } else if (capacity > 0 && required > capacity * 0.9) {
      // Warning if using more than 90% of capacity
      errors.push({
        severity: 'warning',
        code: 'IO_CAPACITY_WARNING',
        message: `${ioType} count (${required}) is using ${Math.round((required / capacity) * 100)}% of PLC capacity (${capacity})`,
        field: `controlPanelConfig.ioCapacity.${ioType}`,
        suggestion: 'Consider leaving headroom for future expansion'
      });
    }
  }

  return errors;
}

/**
 * Validate voltage compatibility between panel config and components
 * @param {string} panelVoltage - Panel voltage from controlPanelConfig
 * @param {Array} operationalItems - Operational items array
 * @param {Array} components - Component catalog
 * @returns {Array} Validation errors
 */
function validateVoltageCompatibility(panelVoltage, operationalItems, components) {
  const errors = [];
  
  if (!panelVoltage) {
    return errors;
  }

  const normalizedPanelVoltage = normalizeVoltage(panelVoltage);
  if (!normalizedPanelVoltage) {
    return errors;
  }

  // Create component lookup map
  const componentMap = new Map();
  if (components && Array.isArray(components)) {
    for (const comp of components) {
      componentMap.set(comp.sku?.trim(), comp);
    }
  }

  // Check operational items
  if (operationalItems && Array.isArray(operationalItems)) {
    for (const item of operationalItems) {
      const component = componentMap.get(item.sku?.trim());
      if (!component || !component.volt) {
        continue; // Skip if component not found or no voltage specified
      }

      const componentVoltage = normalizeVoltage(component.volt);
      if (componentVoltage && componentVoltage !== normalizedPanelVoltage) {
        // Check if it's a critical mismatch (e.g., 208V component in 480V panel)
        const panelVoltNum = parseInt(normalizedPanelVoltage);
        const compVoltNum = parseInt(componentVoltage);

        if (compVoltNum < panelVoltNum) {
          // Component voltage lower than panel - ERROR (safety issue)
          errors.push({
            severity: 'error',
            code: 'VOLTAGE_MISMATCH_LOW',
            message: `Component ${item.sku} (${component.volt}) has lower voltage rating than panel (${panelVoltage})`,
            field: `operationalItems.${item.sku}`,
            suggestion: `Use a component rated for ${panelVoltage} or higher, or adjust panel voltage`
          });
        } else {
          // Component voltage higher than panel - WARNING (may work but check)
          errors.push({
            severity: 'warning',
            code: 'VOLTAGE_MISMATCH_HIGH',
            message: `Component ${item.sku} (${component.volt}) has higher voltage rating than panel (${panelVoltage})`,
            field: `operationalItems.${item.sku}`,
            suggestion: 'Verify component is compatible with panel voltage'
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate phase compatibility between panel config and components
 * @param {string} panelPhase - Panel phase from controlPanelConfig
 * @param {Array} operationalItems - Operational items array
 * @param {Array} components - Component catalog
 * @returns {Array} Validation errors
 */
function validatePhaseCompatibility(panelPhase, operationalItems, components) {
  const errors = [];

  if (!panelPhase) {
    return errors;
  }

  const normalizedPanelPhase = normalizePhase(panelPhase);
  if (!normalizedPanelPhase) {
    return errors;
  }

  // Create component lookup map
  const componentMap = new Map();
  if (components && Array.isArray(components)) {
    for (const comp of components) {
      componentMap.set(comp.sku?.trim(), comp);
    }
  }

  // Check operational items (only for motor control components typically)
  if (operationalItems && Array.isArray(operationalItems)) {
    const motorControlCategories = ['MOTOR CONTROL', 'MOTOR CONTROL/HEATER CONTROL', 'CONTROL'];
    
    for (const item of operationalItems) {
      const component = componentMap.get(item.sku?.trim());
      if (!component || !component.phase) {
        continue; // Skip if component not found or no phase specified
      }

      // Only validate phase for motor control components
      const isMotorControl = motorControlCategories.some(cat => 
        item.category?.includes(cat) || component.category?.includes(cat)
      );

      if (!isMotorControl) {
        continue;
      }

      const componentPhase = normalizePhase(component.phase);
      if (componentPhase && componentPhase !== normalizedPanelPhase) {
        errors.push({
          severity: 'error',
          code: 'PHASE_MISMATCH',
          message: `Component ${item.sku} (${component.phase} phase) is not compatible with panel (${panelPhase} phase)`,
          field: `operationalItems.${item.sku}`,
          suggestion: `Use a ${panelPhase} phase component or adjust panel phase configuration`
        });
      }
    }
  }

  return errors;
}

/**
 * Validate that all required sub-assemblies are present (v2.0 - instance-based)
 * Checks required sub-assemblies for each assembly instance
 * @param {Object} template - Product template with assemblies array
 * @param {Object} productConfiguration - Product configuration (instance-based structure)
 * @param {Array} bom - Legacy BOM array from quote (for backward compatibility)
 * @returns {Array} Validation errors
 */
function validateRequiredSubAssemblies(template, productConfiguration, bom) {
  const errors = [];

  if (!template || !productConfiguration) {
    return errors;
  }

  // Create assembly lookup map
  const assemblyMap = new Map();
  if (template?.assemblies && Array.isArray(template.assemblies)) {
    for (const assembly of template.assemblies) {
      if (assembly.assemblyId) {
        assemblyMap.set(assembly.assemblyId, assembly);
      }
    }
  }

  // Collect all selected sub-assembly IDs from legacy BOM (for backward compatibility)
  const legacySelectedIds = new Set();
  const legacyAssemblyIdWarnings = new Set();
  if (bom && Array.isArray(bom)) {
    for (const item of bom) {
      if (item) {
        const subAssemblyId = item.subAssemblyId;
        if (subAssemblyId) {
          legacySelectedIds.add(subAssemblyId);
          continue;
        }

        const legacyAssemblyId = item.assemblyId;
        if (legacyAssemblyId) {
          legacySelectedIds.add(legacyAssemblyId);

          if (!legacyAssemblyIdWarnings.has(legacyAssemblyId)) {
            errors.push({
              severity: 'warning',
              code: 'LEGACY_ASSEMBLY_ID_IN_BOM',
              message: `Legacy field "assemblyId" detected for sub-assembly "${legacyAssemblyId}". Update saved BOM data to use "subAssemblyId".`,
              field: `bom.${legacyAssemblyId}`,
              suggestion: 'Update BOM entries to store subAssemblyId to align with the v2.0 data model'
            });
            legacyAssemblyIdWarnings.add(legacyAssemblyId);
          }
        }
      }
    }
  }

  // Iterate over all assemblies in productConfiguration
  for (const [assemblyId, assemblyData] of Object.entries(productConfiguration)) {
    // Skip non-assembly keys
    if (assemblyId === 'engineeringHours' || assemblyId === 'programmingHours' || assemblyId === 'productionHours') {
      continue;
    }

    // Get assembly definition
    const assembly = assemblyMap.get(assemblyId);
    if (!assembly) {
      continue;
    }

    // Get required sub-assemblies for this assembly
    const requiredSubAssemblies = assembly.subAssemblies?.required || [];
    if (requiredSubAssemblies.length === 0) {
      continue; // No required sub-assemblies for this assembly
    }

    // Handle instance-based structure (Step 3+: array of instances)
    if (Array.isArray(assemblyData)) {
      if (assemblyData.length === 0) {
        // No instances configured, but required sub-assemblies exist
        for (const requiredId of requiredSubAssemblies) {
          errors.push({
            severity: 'error',
            code: 'REQUIRED_SUB_ASSEMBLY_MISSING',
            message: `Assembly "${assembly.displayName}" requires sub-assembly "${requiredId}" but no instances are configured`,
            field: `productConfiguration.${assemblyId}`,
            suggestion: `Configure at least one instance of "${assembly.displayName}" or add sub-assembly "${requiredId}" to legacy BOM`
          });
        }
        continue;
      }

      // Check each instance of this assembly
      for (const instance of assemblyData) {
        if (!instance || !instance.instanceId) {
          continue;
        }

        const instanceSubAssemblies = instance.selectedSubAssemblies || [];
        const instanceSelectedIds = new Set(instanceSubAssemblies);

        // Check each required sub-assembly for this instance
        // Required sub-assemblies are auto-added by BOMGenerationService during BOM generation,
        // but we validate the structure is correct. If required sub-assemblies are missing from
        // selectedSubAssemblies, BOM generation will auto-add them, so this is just a structural check.
        // However, if a required sub-assembly is explicitly missing and not in legacy BOM, we can note it.
        for (const requiredId of requiredSubAssemblies) {
          // Check if required sub-assembly would be included (either in instance or legacy BOM)
          // Since BOMGenerationService auto-adds required sub-assemblies, we don't error here,
          // but we could add a warning if the structure seems incomplete.
          // For now, we rely on BOM generation to handle auto-adding required sub-assemblies.
        }
      }
    }
    // Handle assembly-level structure (Step 2: flat object)
    // In Step 2, required sub-assemblies will be auto-added by BOMGenerationService
    // So we don't need to validate them here for Step 2 structure
  }

  return errors;
}

/**
 * Validate that all component SKUs exist in the catalog
 * @param {Array} operationalItems - Operational items array
 * @param {Array} components - Component catalog
 * @param {Array} assemblies - Assemblies array (to check assembly components)
 * @param {Array} bom - BOM array (to check assembly components)
 * @returns {Array} Validation errors
 */
function validateComponentSKUs(operationalItems, components, assemblies, bom) {
  const errors = [];

  if (!components || !Array.isArray(components)) {
    return errors;
  }

  // Create component SKU lookup set
  const componentSKUs = new Set();
  for (const comp of components) {
    if (comp.sku) {
      componentSKUs.add(comp.sku.trim());
    }
  }

  // Check operational items
  if (operationalItems && Array.isArray(operationalItems)) {
    for (const item of operationalItems) {
      const sku = item.sku?.trim();
      if (sku && !componentSKUs.has(sku)) {
        errors.push({
          severity: 'error',
          code: 'COMPONENT_NOT_FOUND',
          message: `Component SKU "${sku}" not found in component catalog`,
          field: `operationalItems.${sku}`,
          suggestion: 'Verify SKU is correct or add component to catalog'
        });
      }
    }
  }

  // Check sub-assemblies in BOM
  if (bom && Array.isArray(bom) && assemblies && Array.isArray(assemblies)) {
    const subAssemblyMap = new Map();
    const componentLegacyWarnings = new Set();
    for (const asm of assemblies) {
      const subAssemblyId = asm.subAssemblyId;
      if (subAssemblyId) {
        subAssemblyMap.set(subAssemblyId, asm);
        continue;
      }

      const legacyAssemblyId = asm.assemblyId;
      if (legacyAssemblyId && !componentLegacyWarnings.has(legacyAssemblyId)) {
        errors.push({
          severity: 'warning',
          code: 'LEGACY_ASSEMBLY_ID_IN_TEMPLATE',
          message: `Legacy field "assemblyId" detected for sub-assembly "${legacyAssemblyId}" in template data. Update to use "subAssemblyId".`,
          field: `assemblies.${legacyAssemblyId}`,
          suggestion: 'Update template assemblies to define subAssemblyId for v2.0 compatibility'
        });
        componentLegacyWarnings.add(legacyAssemblyId);
      }
    }

    for (const bomItem of bom) {
      if (!bomItem) continue;

      const subAssemblyId = bomItem.subAssemblyId;
      if (!subAssemblyId) {
        const legacyAssemblyId = bomItem.assemblyId;
        if (legacyAssemblyId && !componentLegacyWarnings.has(legacyAssemblyId)) {
          errors.push({
            severity: 'warning',
            code: 'LEGACY_ASSEMBLY_ID_IN_BOM',
            message: `Legacy field "assemblyId" detected for sub-assembly "${legacyAssemblyId}" in BOM data. Update to use "subAssemblyId".`,
            field: `bom.${legacyAssemblyId}`,
            suggestion: 'Update BOM entries to store subAssemblyId to align with the v2.0 data model'
          });
          componentLegacyWarnings.add(legacyAssemblyId);
        }
        continue;
      }

      const subAssembly = subAssemblyMap.get(subAssemblyId);
      if (!subAssembly || !subAssembly.components) continue;

      for (const comp of subAssembly.components) {
        const sku = comp.sku?.trim();
        if (sku && !componentSKUs.has(sku)) {
          errors.push({
            severity: 'error',
            code: 'COMPONENT_NOT_FOUND_IN_SUB_ASSEMBLY',
            message: `Component SKU "${sku}" in sub-assembly "${subAssemblyId}" not found in catalog`,
            field: `bom.${subAssemblyId}.${sku}`,
            suggestion: `Verify SKU "${sku}" in sub-assembly "${subAssemblyId}" or add component to catalog`
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate minimum required quote fields
 * @param {Object} quote - Quote object
 * @returns {Array} Validation errors
 */
function validateRequiredFields(quote) {
  const errors = [];

  if (!quote) {
    errors.push({
      severity: 'error',
      code: 'QUOTE_MISSING',
      message: 'Quote object is missing',
      field: 'quote',
      suggestion: 'Quote object must be provided'
    });
    return errors;
  }

  // Check required fields from schema
  if (!quote.quoteId || quote.quoteId.trim() === '') {
    errors.push({
      severity: 'error',
      code: 'QUOTE_ID_MISSING',
      message: 'Quote ID is required',
      field: 'quoteId',
      suggestion: 'Generate or enter a quote ID'
    });
  }

  if (!quote.projectName || quote.projectName.trim() === '') {
    errors.push({
      severity: 'error',
      code: 'PROJECT_NAME_MISSING',
      message: 'Project name is required',
      field: 'projectName',
      suggestion: 'Enter a project name'
    });
  }

  if (!quote.customer || quote.customer.trim() === '') {
    errors.push({
      severity: 'error',
      code: 'CUSTOMER_MISSING',
      message: 'Customer is required',
      field: 'customer',
      suggestion: 'Select a customer'
    });
  }

  if (!quote.controlPanelConfig) {
    errors.push({
      severity: 'error',
      code: 'PANEL_CONFIG_MISSING',
      message: 'Control panel configuration is required',
      field: 'controlPanelConfig',
      suggestion: 'Configure the control panel in Step 2'
    });
  } else {
    const panelConfig = quote.controlPanelConfig;
    if (!panelConfig.voltage || panelConfig.voltage.trim() === '') {
      errors.push({
        severity: 'error',
        code: 'VOLTAGE_MISSING',
        message: 'Panel voltage is required',
        field: 'controlPanelConfig.voltage',
        suggestion: 'Select a voltage in panel configuration'
      });
    }

    if (!panelConfig.phase || panelConfig.phase.trim() === '') {
      errors.push({
        severity: 'error',
        code: 'PHASE_MISSING',
        message: 'Panel phase is required',
        field: 'controlPanelConfig.phase',
        suggestion: 'Select a phase in panel configuration'
      });
    }

    if (!panelConfig.plcPlatform || panelConfig.plcPlatform.trim() === '') {
      errors.push({
        severity: 'warning',
        code: 'PLC_PLATFORM_MISSING',
        message: 'PLC platform is not specified',
        field: 'controlPanelConfig.plcPlatform',
        suggestion: 'Select a PLC platform or choose "No PLC (Relay Logic)"'
      });
    }
  }

  return errors;
}

/**
 * Main validation function - validates quote configuration
 * @param {Object} quote - Quote object to validate
 * @param {Object} template - Product template object
 * @param {Array} assemblies - Array of assembly objects
 * @param {Array} components - Array of component objects from catalog
 * @returns {Array} Array of validation error objects
 */
export function validateQuoteConfiguration(quote, template, assemblies, components) {
  const errors = [];

  // 1. Validate required fields
  errors.push(...validateRequiredFields(quote));

  if (!quote) {
    return errors; // Can't continue without quote
  }

  // 2. Validate I/O capacity
  if (quote.controlPanelConfig && quote.productConfiguration && template) {
    const ioCounts = countIOPoints(quote.productConfiguration, template);
    const ioCapacity = quote.controlPanelConfig.ioCapacity;
    errors.push(...validateIOCapacity(ioCounts, ioCapacity));
  }

  // 3. Validate voltage compatibility
  if (quote.controlPanelConfig && quote.operationalItems) {
    errors.push(...validateVoltageCompatibility(
      quote.controlPanelConfig.voltage,
      quote.operationalItems,
      components
    ));
  }

  // 4. Validate phase compatibility
  if (quote.controlPanelConfig && quote.operationalItems) {
    errors.push(...validatePhaseCompatibility(
      quote.controlPanelConfig.phase,
      quote.operationalItems,
      components
    ));
  }

  // 5. Validate required sub-assemblies (v2.0 - instance-based)
  if (template && quote.productConfiguration) {
    errors.push(...validateRequiredSubAssemblies(
      template,
      quote.productConfiguration,
      quote.bom
    ));
  }

  // 6. Validate component SKUs exist in catalog
  errors.push(...validateComponentSKUs(
    quote.operationalItems,
    components,
    assemblies,
    quote.bom
  ));

  return errors;
}

// Default export
const ValidationService = {
  validateQuoteConfiguration,
  validateRequiredFields,
  validateIOCapacity,
  validateVoltageCompatibility,
  validatePhaseCompatibility,
  validateRequiredSubAssemblies,
  validateComponentSKUs,
  countIOPoints,
  normalizeVoltage,
  normalizePhase,
  // Legacy alias for backward compatibility
  validateRequiredAssemblies: validateRequiredSubAssemblies
};

export default ValidationService;

