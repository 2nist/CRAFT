/**
 * BOMGenerationService
 * 
 * Generates consolidated operational items (OI) list from quote configuration.
 * This service performs the critical BOM generation pipeline:
 * - Expands sub-assemblies into components
 * - Multiplies quantities correctly
 * - Consolidates duplicate SKUs
 * - Applies I/O field rules for auto-generation
 * - Adds pricing and presentation attributes
 */

import PricingService from './PricingService.js';

/**
 * Normalize voltage string for comparison (used in I/O field rule conditions)
 * @param {string} voltage - Voltage string
 * @returns {string} Normalized voltage
 */
function normalizeVoltage(voltage) {
  if (!voltage) return '';
  const match = String(voltage).match(/(\d+)/);
  return match ? match[1] : String(voltage).trim();
}

/**
 * Normalize phase string for comparison (used in I/O field rule conditions)
 * @param {string} phase - Phase string
 * @returns {string} Normalized phase ("1" or "3")
 */
function normalizePhase(phase) {
  if (!phase) return '';
  const phaseStr = String(phase).toLowerCase().trim();
  if (phaseStr.includes('1') || phaseStr.includes('single') || phaseStr.includes('one')) {
    return '1';
  }
  if (phaseStr.includes('3') || phaseStr.includes('three') || phaseStr.includes('tri')) {
    return '3';
  }
  return phaseStr;
}

/**
 * Check if panel config condition matches
 * @param {Object} condition - Condition object
 * @param {Object} panelConfig - Panel configuration
 * @returns {boolean} True if matches
 */
function evaluatePanelConfigCondition(condition, panelConfig) {
  if (!condition || !panelConfig) return true;

  for (const [key, expectedValue] of Object.entries(condition)) {
    const actualValue = panelConfig[key];

    if (key === 'voltage') {
      if (normalizeVoltage(actualValue) !== normalizeVoltage(expectedValue)) {
        return false;
      }
    } else if (key === 'phase') {
      if (normalizePhase(actualValue) !== normalizePhase(expectedValue)) {
        return false;
      }
    } else if (String(actualValue) !== String(expectedValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Get I/O field value from instance fields (v2.0 - instance-based)
 * @param {string} fieldName - Field name
 * @param {Object} instanceFields - Instance fields object (instance.fields)
 * @param {Object} assemblyFields - Assembly fields definition (for defaults)
 * @returns {number} Field value as number
 */
function getIOFieldValue(fieldName, instanceFields, assemblyFields = {}) {
  if (!instanceFields || !fieldName) return 0;

  let fieldValue = instanceFields[fieldName];

  // If not found, check assembly field defaults
  if ((fieldValue === undefined || fieldValue === null || fieldValue === '') && assemblyFields) {
    const allFields = [
      ...(assemblyFields.digitalIn || []),
      ...(assemblyFields.digitalOut || []),
      ...(assemblyFields.analogIn || []),
      ...(assemblyFields.analogOut || [])
    ];

    const fieldDef = allFields.find(f => f.fieldName === fieldName);
    if (fieldDef?.defaultValue !== undefined) {
      fieldValue = fieldDef.defaultValue;
    }
  }

  // Convert to number
  if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
    const numValue = parseFloat(fieldValue);
    if (!isNaN(numValue)) {
      return numValue;
    }
    // For boolean/list fields, count as 1 if truthy
    if (fieldValue === true || fieldValue === 'true' || fieldValue === 'True') {
      return 1;
    }
    // For list selections, count as 1 if selected
    if (fieldValue && fieldValue !== '' && fieldValue !== 'none') {
      return 1;
    }
  }

  return 0;
}

/**
 * Determine section group from component category
 * @param {string} category - Component category
 * @returns {string} Section group ("Hardware", "Components", "Labor", or "Other")
 */
function determineSectionGroup(category) {
  if (!category) return 'Other';

  const categoryUpper = String(category).toUpperCase();

  // Hardware categories
  if (categoryUpper.includes('ENCLOSURE') || 
      categoryUpper.includes('PANEL') ||
      categoryUpper.includes('DIN RAIL') ||
      categoryUpper.includes('MOUNTING')) {
    return 'Hardware';
  }

  // Components (default for most)
  if (categoryUpper.includes('PLC') ||
      categoryUpper.includes('CONTROL') ||
      categoryUpper.includes('MOTOR') ||
      categoryUpper.includes('INSTRUMENT') ||
      categoryUpper.includes('SAFETY') ||
      categoryUpper.includes('WIRING') ||
      categoryUpper.includes('PNU')) {
    return 'Components';
  }

  // Labor is typically not in component catalog, but handle if needed
  if (categoryUpper.includes('LABOR')) {
    return 'Labor';
  }

  return 'Components'; // Default
}

/**
 * Generate display name for an operational item
 * @param {Object} component - Component object from catalog
 * @param {string} sourceSubAssembly - Sub-assembly ID (if from sub-assembly)
 * @param {string} sourceRule - Rule ID (if from I/O field rule)
 * @param {Object} subAssembly - Sub-assembly object (if available)
 * @returns {string} Display name
 */
function generateDisplayName(component, sourceSubAssembly, sourceRule, subAssembly) {
  // If from sub-assembly, use sub-assembly description as base
  if (subAssembly && subAssembly.description) {
    // For sub-assemblies, use sub-assembly description
    if (sourceRule) {
      // If generated by rule, append component description
      return `${subAssembly.description} - ${component?.description || component?.sku || 'Component'}`;
    }
    return subAssembly.description;
  }

  // If from I/O field rule, use component description with context
  if (sourceRule) {
    return component?.description || component?.sku || 'Component';
  }

  // Default: use component description or SKU
  return component?.description || component?.sku || 'Unknown Component';
}

/**
 * Expand sub-assemblies from a list of sub-assembly IDs into component list
 * @param {Array} subAssemblyIds - Array of sub-assembly IDs to expand
 * @param {Array} subAssemblies - All sub-assemblies array (contains subAssemblyId)
 * @param {Map} componentMap - Component lookup map
 * @param {string} sourceAssemblyId - Assembly ID that owns these sub-assemblies (for tracking)
 * @param {string} sourceInstanceId - Instance ID that owns these sub-assemblies (for tracking)
 * @returns {Array} Array of component items with metadata
 */
function expandSubAssemblies(subAssemblyIds, subAssemblies, componentMap, sourceAssemblyId = null, sourceInstanceId = null) {
  const componentItems = [];

  if (!subAssemblyIds || !Array.isArray(subAssemblyIds) || subAssemblyIds.length === 0) {
    return componentItems;
  }

  // Create sub-assembly lookup map
  const subAssemblyMap = new Map();
  if (subAssemblies && Array.isArray(subAssemblies)) {
    for (const asm of subAssemblies) {
      const subAssemblyId = asm?.subAssemblyId;
      if (!subAssemblyId) {
        if (asm?.assemblyId) {
          console.warn(`Legacy sub-assembly entry missing subAssemblyId: ${asm.assemblyId}`);
        }
        continue;
      }

      subAssemblyMap.set(subAssemblyId, asm);
    }
  }

  // Process each sub-assembly ID (quantity is always 1 per instance)
  for (const subAssemblyId of subAssemblyIds) {
    if (!subAssemblyId || typeof subAssemblyId !== 'string') continue;

    const subAssembly = subAssemblyMap.get(subAssemblyId);
    if (!subAssembly || !subAssembly.components) {
      console.warn(`Sub-assembly "${subAssemblyId}" not found in sub-assemblies catalog`);
      continue;
    }

    // Process each component in the sub-assembly
    for (const comp of subAssembly.components) {
      const sku = comp.sku?.trim();
      if (!sku) continue;

      const component = componentMap.get(sku);
      const componentQuantity = parseInt(comp.quantity) || 1;

      componentItems.push({
        sku,
        quantity: componentQuantity, // Quantity per instance (will be multiplied by instance count in consolidation)
        component: component || null,
        sourceSubAssembly: subAssemblyId,
        sourceAssembly: sourceAssemblyId, // Track which assembly this came from
        sourceInstanceId: sourceInstanceId, // Track which instance this came from
        sourceRule: null,
        subAssembly: subAssembly,
        componentNotes: comp.notes || '',
        subAssemblyNotes: ''
      });
    }
  }

  return componentItems;
}

/**
 * Apply I/O field rules to generate additional components (v2.0 - instance-based)
 * @param {Object} assembly - Assembly object with ioFieldRules
 * @param {Object} instanceFields - Instance fields object (instance.fields)
 * @param {Object} panelConfig - Panel configuration
 * @param {Map} componentMap - Component lookup map
 * @param {string} sourceAssemblyId - Assembly ID (for tracking)
 * @param {string} sourceInstanceId - Instance ID (for tracking)
 * @returns {Array} Array of component items generated from rules
 */
function applyIOFieldRules(assembly, instanceFields, panelConfig, componentMap, sourceAssemblyId = null, sourceInstanceId = null) {
  const componentItems = [];

  if (!assembly?.ioFieldRules || !Array.isArray(assembly.ioFieldRules)) {
    return componentItems;
  }

  if (!instanceFields) {
    return componentItems;
  }

  // Evaluate each I/O field rule for this assembly
  for (const rule of assembly.ioFieldRules) {
    if (!rule.ruleId || !rule.sourceField || !rule.components) {
      continue;
    }

    // Check rule conditions (if any)
    if (rule.condition) {
      if (rule.condition.panelConfig) {
        if (!evaluatePanelConfigCondition(rule.condition.panelConfig, panelConfig)) {
          continue; // Condition not met, skip this rule
        }
      }
    }

    // Get source field value from instance fields
    const sourceFieldValue = getIOFieldValue(rule.sourceField, instanceFields, assembly.fields);

    // Get quantity field value (if specified)
    let quantityMultiplier = sourceFieldValue;
    if (rule.quantityField) {
      quantityMultiplier = getIOFieldValue(rule.quantityField, instanceFields, assembly.fields);
    }

    // If no quantity, skip this rule
    if (!quantityMultiplier || quantityMultiplier <= 0) {
      continue;
    }

    // Generate components based on quantity multiplier
    // Example: 3 motors × 1 contactor per motor = 3 contactors total (per instance)
    for (const ruleComponent of rule.components) {
      const sku = ruleComponent.sku?.trim();
      if (!sku) continue;

      const component = componentMap.get(sku);
      const quantityPerUnit = parseFloat(ruleComponent.quantityPerUnit) || 1;
      // Total quantity = quantity per unit × number of units (per instance)
      const totalQuantity = quantityPerUnit * quantityMultiplier;

      // Create item with rule metadata
      componentItems.push({
        sku,
        quantity: totalQuantity, // Quantity per instance
        component: component || null,
        sourceSubAssembly: null,
        sourceAssembly: sourceAssemblyId,
        sourceInstanceId: sourceInstanceId,
        sourceRule: rule.ruleId,
        subAssembly: null,
        componentNotes: '',
        subAssemblyNotes: '',
        ruleDisplayName: ruleComponent.displayName,
        ruleSectionGroup: ruleComponent.sectionGroup,
        totalUnits: quantityMultiplier
      });
    }
  }

  return componentItems;
}

/**
 * Consolidate component items by SKU
 * @param {Array} componentItems - Array of component items from assemblies and rules
 * @returns {Map} Map of SKU -> consolidated item
 */
function consolidateBySKU(componentItems) {
  const consolidatedMap = new Map();

  for (const item of componentItems) {
    const sku = item.sku?.trim();
    if (!sku) continue;

    if (consolidatedMap.has(sku)) {
      // Merge with existing item
      const existing = consolidatedMap.get(sku);
      existing.quantity += item.quantity;
      
      // Merge source sub-assemblies (comma-separated)
      if (item.sourceSubAssembly && !existing.sourceSubAssemblies?.includes(item.sourceSubAssembly)) {
        if (!existing.sourceSubAssemblies) {
          existing.sourceSubAssemblies = [item.sourceSubAssembly];
        } else {
          existing.sourceSubAssemblies.push(item.sourceSubAssembly);
        }
      }

      // Merge source assemblies (v2.0 - track which assemblies contributed)
      if (item.sourceAssembly && !existing.sourceAssemblies?.includes(item.sourceAssembly)) {
        if (!existing.sourceAssemblies) {
          existing.sourceAssemblies = [item.sourceAssembly];
        } else {
          existing.sourceAssemblies.push(item.sourceAssembly);
        }
      }

      // Merge source rules (comma-separated)
      if (item.sourceRule && !existing.sourceRules?.includes(item.sourceRule)) {
        if (!existing.sourceRules) {
          existing.sourceRules = [item.sourceRule];
        } else {
          existing.sourceRules.push(item.sourceRule);
        }
      }

      // Keep first component reference (they should be the same anyway)
      if (!existing.component && item.component) {
        existing.component = item.component;
      }

      // Merge notes
      if (item.componentNotes && !existing.notes?.includes(item.componentNotes)) {
        existing.notes = existing.notes 
          ? `${existing.notes}; ${item.componentNotes}`
          : item.componentNotes;
      }

      // Preserve rule metadata if available
      if (item.ruleDisplayName) {
        existing.ruleDisplayName = item.ruleDisplayName;
      }
      if (item.ruleSectionGroup) {
        existing.ruleSectionGroup = item.ruleSectionGroup;
      }
    } else {
      // Create new consolidated item
      consolidatedMap.set(sku, {
        sku,
        quantity: item.quantity,
        component: item.component,
        sourceSubAssembly: item.sourceSubAssembly,
        sourceSubAssemblies: item.sourceSubAssembly ? [item.sourceSubAssembly] : [],
        sourceAssembly: item.sourceAssembly,
        sourceAssemblies: item.sourceAssembly ? [item.sourceAssembly] : [],
        sourceRule: item.sourceRule,
        sourceRules: item.sourceRule ? [item.sourceRule] : [],
        subAssembly: item.subAssembly,
        notes: item.componentNotes || item.subAssemblyNotes || '',
        ruleDisplayName: item.ruleDisplayName,
        ruleSectionGroup: item.ruleSectionGroup,
        unitIndex: item.unitIndex,
        totalUnits: item.totalUnits
      });
    }
  }

  return consolidatedMap;
}

/**
 * Convert consolidated items to operational items format with pricing and presentation attributes
 * @param {Map} consolidatedMap - Map of consolidated items
 * @param {Array} componentCatalog - Component catalog array
 * @returns {Array} Array of operational items
 */
function convertToOperationalItems(consolidatedMap, componentCatalog) {
  const operationalItems = [];

  for (const [sku, item] of consolidatedMap.entries()) {
    const component = item.component;

    // Calculate pricing using PricingService
    const pricing = PricingService.calculateComponentPrice(sku, item.quantity, componentCatalog);

    // Determine section group
    let sectionGroup = item.ruleSectionGroup;
    if (!sectionGroup && component) {
      sectionGroup = determineSectionGroup(component.category);
    }
    if (!sectionGroup) {
      sectionGroup = 'Components';
    }

    // Generate display name
    let displayName = item.ruleDisplayName;
    if (!displayName) {
      displayName = generateDisplayName(
        component,
        item.sourceSubAssembly,
        item.sourceRule,
        item.subAssembly
      );
    }

    // Build operational item
    const operationalItem = {
      sku: sku,
      description: component?.description || sku,
      quantity: item.quantity,
      unitPrice: pricing.unitPrice,
      totalPrice: pricing.totalPrice,
      vendor: component?.vendor || '',
      vndrnum: component?.vndrnum || component?.attributes?.vndrnum || '',
      category: component?.category || '',
      sectionGroup: sectionGroup,
      displayName: displayName,
      sourceSubAssembly: item.sourceSubAssemblies.length > 0 
        ? (item.sourceSubAssemblies.length === 1 ? item.sourceSubAssemblies[0] : item.sourceSubAssemblies.join(', '))
        : null,
      sourceRule: item.sourceRules.length > 0 
        ? (item.sourceRules.length === 1 ? item.sourceRules[0] : `ioFieldRule.${item.sourceRules.join(',')}`)
        : null,
      notes: item.notes || ''
    };

    operationalItems.push(operationalItem);
  }

  return operationalItems;
}

/**
 * Main function: Generate operational items from quote configuration (v2.0 - instance-based)
 * @param {Object} quote - Quote object with productConfiguration (instance-based), controlPanelConfig
 * @param {Array} subAssemblies - Array of all sub-assembly objects (with subAssemblyId)
 * @param {Array} components - Array of all component objects from catalog
 * @param {Object} template - Product template with assemblies array (v2.0 structure)
 * @returns {Array} Array of operational items
 */
export function generateOperationalItems(quote, subAssemblies, components, template) {
  // Validate inputs
  if (!quote) {
    console.warn('BOMGenerationService: Quote is required');
    return [];
  }

  // Create component lookup map for fast access
  const componentMap = new Map();
  if (components && Array.isArray(components)) {
    for (const comp of components) {
      if (comp.sku) {
        componentMap.set(comp.sku.trim(), comp);
      }
    }
  }

  // Create assembly lookup map (from template.assemblies)
  const assemblyMap = new Map();
  if (template?.assemblies && Array.isArray(template.assemblies)) {
    for (const assembly of template.assemblies) {
      if (assembly.assemblyId) {
        assemblyMap.set(assembly.assemblyId, assembly);
      }
    }
  }

  const panelConfig = quote.controlPanelConfig || {};
  const productConfiguration = quote.productConfiguration || {};
  const allComponentItems = []; // Global collection of all components from all instances

  // Step 1: Iterate over all assemblies in productConfiguration (v2.0 instance-based structure)
  for (const [assemblyId, assemblyData] of Object.entries(productConfiguration)) {
    // Skip non-assembly keys (like engineeringHours, programmingHours, etc.)
    if (assemblyId === 'engineeringHours' || assemblyId === 'programmingHours' || assemblyId === 'productionHours') {
      continue;
    }

    // Get assembly definition from template
    const assembly = assemblyMap.get(assemblyId);
    if (!assembly) {
      console.warn(`Assembly "${assemblyId}" not found in template`);
      continue;
    }

    // Handle instance-based structure (Step 3+: array of instances)
    if (Array.isArray(assemblyData)) {
      // Step 2: Iterate over all instances of this assembly
      for (const instance of assemblyData) {
        if (!instance || !instance.instanceId) {
          continue;
        }

        const instanceId = instance.instanceId;
        const instanceFields = instance.fields || {};
        const instanceSubAssemblies = instance.selectedSubAssemblies || [];

        // Step 2a: Auto-add required sub-assemblies for this instance
        // (This replaces the old SubAssemblyRuleEngine logic)
        const requiredSubAssemblies = assembly.subAssemblies?.required || [];
        const allSubAssembliesForInstance = [
          ...requiredSubAssemblies,
          ...instanceSubAssemblies.filter(id => !requiredSubAssemblies.includes(id))
        ];

        // Step 2b: Expand sub-assemblies for this instance
        const subAssemblyItems = expandSubAssemblies(
          allSubAssembliesForInstance,
          subAssemblies,
          componentMap,
          assemblyId,
          instanceId
        );
        allComponentItems.push(...subAssemblyItems);

        // Step 2c: Apply I/O field rules for this instance
        const ruleItems = applyIOFieldRules(
          assembly,
          instanceFields,
          panelConfig,
          componentMap,
          assemblyId,
          instanceId
        );
        allComponentItems.push(...ruleItems);
      }
    } 
    // Handle assembly-level structure (Step 2: flat object with fields)
    else if (assemblyData && typeof assemblyData === 'object') {
      // This is the assembly-level structure from Step 2
      // Treat it as a single instance with assembly-level fields
      const instanceFields = assemblyData;

      // Auto-add required sub-assemblies
      const requiredSubAssemblies = assembly.subAssemblies?.required || [];
      const allSubAssembliesForInstance = [...requiredSubAssemblies];

      // Expand sub-assemblies
      const subAssemblyItems = expandSubAssemblies(
        allSubAssembliesForInstance,
        subAssemblies,
        componentMap,
        assemblyId,
        null // No instanceId for assembly-level structure
      );
      allComponentItems.push(...subAssemblyItems);

      // Apply I/O field rules
      const ruleItems = applyIOFieldRules(
        assembly,
        instanceFields,
        panelConfig,
        componentMap,
        assemblyId,
        null // No instanceId for assembly-level structure
      );
      allComponentItems.push(...ruleItems);
    }
  }

  // Step 3: Also handle legacy BOM format (for backward compatibility)
  const bom = quote.bom || [];
  if (bom.length > 0) {
    // Legacy BOM expansion
    for (const bomItem of bom) {
      if (!bomItem) continue;
      const subAssemblyId = bomItem.subAssemblyId;
      if (!subAssemblyId) {
        if (bomItem.assemblyId) {
          console.warn('Legacy BOM item detected without subAssemblyId:', bomItem.assemblyId);
        }
        continue;
      }

      const legacyItems = expandSubAssemblies(
        [subAssemblyId],
        subAssemblies,
        componentMap,
        null,
        null
      );
      // Multiply by quantity if specified
      if (bomItem.quantity && bomItem.quantity > 1) {
        legacyItems.forEach(item => {
          item.quantity = item.quantity * bomItem.quantity;
        });
      }
      allComponentItems.push(...legacyItems);
    }
  }

  // Step 4: Consolidate by SKU (this will correctly sum quantities across all instances)
  const consolidatedMap = consolidateBySKU(allComponentItems);

  // Step 5: Convert to operational items format with pricing and presentation attributes
  const operationalItems = convertToOperationalItems(consolidatedMap, components);

  // Sort by sectionGroup, then by displayName
  operationalItems.sort((a, b) => {
    const groupOrder = { Hardware: 0, Components: 1, Labor: 2, Other: 3 };
    const groupCompare = (groupOrder[a.sectionGroup] || 99) - (groupOrder[b.sectionGroup] || 99);
    if (groupCompare !== 0) return groupCompare;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  return operationalItems;
}

// Default export
const BOMGenerationService = {
  generateOperationalItems,
  expandSubAssemblies,
  applyIOFieldRules,
  consolidateBySKU,
  convertToOperationalItems,
  determineSectionGroup,
  generateDisplayName
};

export default BOMGenerationService;

