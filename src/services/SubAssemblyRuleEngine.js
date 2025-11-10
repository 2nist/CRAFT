/**
 * SubAssemblyRuleEngine
 * 
 * Evaluates sub-assembly requirements and recommendations based on product template
 * and quote configuration. This service analyzes the instance-based productConfiguration
 * to determine which sub-assemblies are required and recommended for each assembly instance.
 */

/**
 * Evaluate sub-assembly rules from template and quote configuration
 * 
 * @param {Object} template - Product template with assemblies array (v2.0 structure)
 * @param {Object} quote - Quote object with productConfiguration and controlPanelConfig
 * @returns {Object} Object with requiredSubAssemblies and recommendedSubAssemblies arrays
 */
export function evaluateSubAssemblyRules(template, quote) {
  const requiredSubAssemblies = [];
  const recommendedSubAssemblies = [];

  if (!template || !quote) {
    return {
      requiredSubAssemblies: [],
      recommendedSubAssemblies: []
    };
  }

  const productConfiguration = quote.productConfiguration || {};
  const panelConfig = quote.controlPanelConfig || {};

  // Create assembly lookup map
  const assemblyMap = new Map();
  if (template.assemblies && Array.isArray(template.assemblies)) {
    for (const assembly of template.assemblies) {
      if (assembly.assemblyId) {
        assemblyMap.set(assembly.assemblyId, assembly);
      }
    }
  }

  // Track sub-assembly IDs to avoid duplicates
  const requiredIds = new Set();
  const recommendedIds = new Set();

  // Iterate over all assemblies in productConfiguration
  for (const [assemblyId, assemblyData] of Object.entries(productConfiguration)) {
    // Skip non-assembly keys
    if (assemblyId === 'engineeringHours' || assemblyId === 'programmingHours' || assemblyId === 'productionHours') {
      continue;
    }

    // Get assembly definition from template
    const assembly = assemblyMap.get(assemblyId);
    if (!assembly) {
      continue;
    }

    // Get sub-assembly requirements for this assembly
    const required = assembly.subAssemblies?.required || [];
    const optional = assembly.subAssemblies?.optional || [];

    // Handle instance-based structure (Step 3+: array of instances)
    if (Array.isArray(assemblyData)) {
      // For each instance of this assembly, add its required/optional sub-assemblies
      for (const instance of assemblyData) {
        if (!instance || !instance.instanceId) {
          continue;
        }

        // Add required sub-assemblies
        for (const subAssemblyId of required) {
          if (!requiredIds.has(subAssemblyId)) {
            requiredSubAssemblies.push({
              subAssemblyId: subAssemblyId,
              sourceAssemblyId: assemblyId,
              sourceAssemblyDisplayName: assembly.displayName,
              sourceInstanceId: instance.instanceId
            });
            requiredIds.add(subAssemblyId);
          }
        }

        // Add recommended (optional) sub-assemblies
        for (const subAssemblyId of optional) {
          if (!recommendedIds.has(subAssemblyId) && !requiredIds.has(subAssemblyId)) {
            recommendedSubAssemblies.push({
              subAssemblyId: subAssemblyId,
              sourceAssemblyId: assemblyId,
              sourceAssemblyDisplayName: assembly.displayName,
              sourceInstanceId: instance.instanceId
            });
            recommendedIds.add(subAssemblyId);
          }
        }
      }
    }
    // Handle assembly-level structure (Step 2: flat object with fields)
    else if (assemblyData && typeof assemblyData === 'object') {
      // This is the assembly-level structure from Step 2
      // Add required sub-assemblies
      for (const subAssemblyId of required) {
        if (!requiredIds.has(subAssemblyId)) {
          requiredSubAssemblies.push({
            subAssemblyId: subAssemblyId,
            sourceAssemblyId: assemblyId,
            sourceAssemblyDisplayName: assembly.displayName,
            sourceInstanceId: null
          });
          requiredIds.add(subAssemblyId);
        }
      }

      // Add recommended (optional) sub-assemblies
      for (const subAssemblyId of optional) {
        if (!recommendedIds.has(subAssemblyId) && !requiredIds.has(subAssemblyId)) {
          recommendedSubAssemblies.push({
            subAssemblyId: subAssemblyId,
            sourceAssemblyId: assemblyId,
            sourceAssemblyDisplayName: assembly.displayName,
            sourceInstanceId: null
          });
          recommendedIds.add(subAssemblyId);
        }
      }
    }
  }

  return {
    requiredSubAssemblies: requiredSubAssemblies,
    recommendedSubAssemblies: recommendedSubAssemblies
  };
}

// Default export
const SubAssemblyRuleEngine = {
  evaluateSubAssemblyRules
};

export default SubAssemblyRuleEngine;

