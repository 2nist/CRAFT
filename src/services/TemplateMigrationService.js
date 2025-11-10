/**
 * @file TemplateMigrationService.js
 * @description Provides an on-the-fly migration service to convert legacy v1.0
 * product templates to the new v2.0 instance-based "Assembly Card" architecture.
 */

/**
 * Migrates a product template to the v2.0 "Assembly Card" structure in memory.
 * 
 * v1.0/v1.5 Structure (flat):
 * {
 *   "productCode": 100,
 *   "fields": { "digitalIn": [...] },
 *   "assemblies": { "required": ["SA-001"], "optional": ["SA-002"] }, // This was the v1.0 "subAssemblies"
 *   "subAssemblyRules": [], // This was the v1.5 "subAssemblyRules"
 *   "ioFieldRules": []
 * }
 * 
 * v2.0 Structure (nested):
 * {
 *   "productCode": 100,
 *   "assemblies": [ // This is the new "Process Card" array
 *     {
 *       "assemblyId": "main_config",
 *       "displayName": "Main Configuration",
 *       ...
 *       "fields": { "digitalIn": [...] },
 *       "subAssemblies": { "required": ["SA-001"], "optional": ["SA-002"] },
 *       "ioFieldRules": []
 *     }
 *   ]
 * }
 * 
 * @param {object} template - The product template object loaded from disk.
 * @returns {object} A v2.0 compatible template object.
 */
export function migrateTemplate(template) {
  // If template.assemblies is already an array, it's v2.0. Return as is.
  if (Array.isArray(template.assemblies)) {
    return template;
  }

  // It's a v1.0/v1.5 template. We need to migrate it.
  console.warn(`Migrating legacy template "${template.productCode || 'unknown'}" to v2.0 structure in memory.`);

  // Create a new template object, preserving top-level keys.
  const migratedTemplate = {
    productCode: template.productCode,
    productName: template.productName,
    estimatedBaseLaborHours: template.estimatedBaseLaborHours || template.engineeringHours || 0,
    notes: template.notes,
    // Add any other top-level fields you want to preserve
  };

  const productLabel = template.productName || 'this product';
  const assemblyTitle = `Assembly Configuration for ${productLabel}`;

  // Create the single, new "Assembly" (Process Card) to wrap all old top-level config
  const newMainAssembly = {
    assemblyId: "main_config",
    displayName: assemblyTitle,
    description: '',
    allowMultiple: false,
    features: [],
    
    // 1. Copy old top-level I/O fields
    fields: template.fields || {},
    
    // 2. Copy old top-level "assemblies" (which were actually Sub-Assemblies)
    // We also merge the static `required` from v1.5 `assemblies`
    subAssemblies: template.assemblies || { required: [], optional: [] },
    
    // 3. Copy old top-level "ioFieldRules"
    ioFieldRules: template.ioFieldRules || [],
  };

  // Note: The v1.5 'subAssemblyRules' are intentionally dropped.
  // That logic is now deprecated and handled by the v2.0 BOM service
  // which auto-adds the 'required' subAssemblies from the list above.

  // Set the new `assemblies` array
  migratedTemplate.assemblies = [newMainAssembly];

  // Return the new, v2.0 compatible object.
  // The old keys (`fields`, `assemblies`, `subAssemblyRules`, `ioFieldRules`)
  // are implicitly "deleted" because we only copied the keys we wanted.
  return migratedTemplate;
}

export default {
  migrateTemplate,
};

