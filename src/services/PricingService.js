/**
 * PricingService
 * 
 * Provides centralized pricing calculation functions for quotes, assemblies, and components.
 * This service abstracts all pricing logic to support future integrations (dynamic pricing, Pipedrive).
 * 
 * Labor Rates:
 * - Engineering: $60/hr
 * - Production: $35/hr
 * - Programming: $85/hr
 * - Assembly Production: $35/hr (default)
 */

/**
 * Calculate the price for a single component
 * @param {string} sku - Component SKU
 * @param {number} quantity - Quantity needed
 * @param {Array} componentCatalog - Array of component objects with {sku, price, ...}
 * @returns {{unitPrice: number, totalPrice: number}} Price calculation result
 */
export function calculateComponentPrice(sku, quantity, componentCatalog) {
  if (!sku || !quantity || quantity <= 0) {
    return { unitPrice: 0, totalPrice: 0 };
  }

  // Find component in catalog
  const trimmedSku = sku?.trim();
  const component = componentCatalog?.find(c => c.sku === trimmedSku);

  if (!component) {
    console.warn(`Component not found in catalog: ${sku}`);
    return { unitPrice: 0, totalPrice: 0 };
  }

  const unitPrice = parseFloat(component.price) || 0;
  const totalPrice = unitPrice * quantity;

  return {
    unitPrice,
    totalPrice
  };
}

/**
 * Calculate the total cost for an assembly (material + labor)
 * @param {string} assemblyId - Assembly ID
 * @param {number} quantity - Quantity of assemblies needed
 * @param {Array} assemblies - Array of assembly objects with {assemblyId, components, estimatedLaborHours, ...}
 * @param {Array} components - Array of component objects with {sku, price, ...}
 * @param {Object} options - Optional configuration
 * @param {number} options.laborRatePerHour - Labor rate per hour for assembly production (default: 35)
 * @returns {{materialCost: number, laborCost: number, totalCost: number}} Cost calculation result
 */
export function calculateAssemblyCost(assemblyId, quantity, assemblies, components, options = {}) {
  if (!assemblyId || !quantity || quantity <= 0) {
    return { materialCost: 0, laborCost: 0, totalCost: 0 };
  }

  // Find assembly
  const assembly = assemblies?.find(a => a.assemblyId === assemblyId);

  if (!assembly) {
    console.warn(`Assembly not found: ${assemblyId}`);
    return { materialCost: 0, laborCost: 0, totalCost: 0 };
  }

  // Calculate material cost from components
  let materialCost = 0;
  if (assembly.components && Array.isArray(assembly.components)) {
    for (const ac of assembly.components) {
      const trimmedSku = ac.sku?.trim();
      const component = components?.find(c => c.sku === trimmedSku);

      if (component) {
        const componentPrice = parseFloat(component.price) || 0;
        const componentQuantity = parseInt(ac.quantity) || 1;
        materialCost += componentPrice * componentQuantity * quantity;
      } else {
        console.warn(`Component not found in catalog: ${ac.sku} (for assembly ${assemblyId})`);
      }
    }
  }

  // Calculate labor cost
  const laborRatePerHour = options.laborRatePerHour || 35; // Default production labor rate
  const laborHours = parseFloat(assembly.estimatedLaborHours) || 0;
  const laborCost = laborHours * laborRatePerHour * quantity;

  const totalCost = materialCost + laborCost;

  return {
    materialCost,
    laborCost,
    totalCost
  };
}

/**
 * Calculate total BOM cost from operational items
 * @param {Array} operationalItems - Array of operational item objects with {quantity, unitPrice, totalPrice, ...}
 * @param {Object} laborHours - Optional labor hours breakdown
 * @param {number} laborHours.engineering - Engineering hours (rate: $60/hr)
 * @param {number} laborHours.production - Production hours (rate: $35/hr)
 * @param {number} laborHours.programming - Programming hours (rate: $85/hr)
 * @returns {{materialCost: number, laborCost: number, totalCOGS: number}} BOM cost calculation result
 */
export function calculateBOMCost(operationalItems, laborHours = {}) {
  // Calculate material cost from operational items
  let materialCost = 0;
  if (operationalItems && Array.isArray(operationalItems)) {
    for (const item of operationalItems) {
      // Prefer totalPrice if available (already calculated), otherwise calculate from unitPrice * quantity
      if (item.totalPrice !== undefined && item.totalPrice !== null) {
        materialCost += parseFloat(item.totalPrice) || 0;
      } else if (item.unitPrice !== undefined && item.quantity !== undefined) {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const quantity = parseInt(item.quantity) || 0;
        materialCost += unitPrice * quantity;
      }
    }
  }

  // Calculate labor cost from labor hours
  const engineeringHours = parseFloat(laborHours.engineering) || 0;
  const productionHours = parseFloat(laborHours.production) || 0;
  const programmingHours = parseFloat(laborHours.programming) || 0;

  const engineeringCost = engineeringHours * 60; // $60/hr
  const productionCost = productionHours * 35;   // $35/hr
  const programmingCost = programmingHours * 85; // $85/hr

  const laborCost = engineeringCost + productionCost + programmingCost;

  // Total COGS (Cost of Goods Sold) = Material + Labor
  const totalCOGS = materialCost + laborCost;

  return {
    materialCost,
    laborCost,
    totalCOGS
  };
}

/**
 * Calculate final price from COGS and target margin percentage
 * @param {number} totalCOGS - Total Cost of Goods Sold
 * @param {number} marginPercent - Target margin as percentage (e.g., 25 for 25%)
 * @returns {{finalPrice: number, marginPercent: number}} Price calculation result
 */
export function calculateFinalPrice(totalCOGS, marginPercent) {
  const cogs = parseFloat(totalCOGS) || 0;
  const margin = parseFloat(marginPercent) || 0;

  // Handle edge cases
  if (cogs <= 0) {
    return { finalPrice: 0, marginPercent: 0 };
  }

  if (margin <= 0) {
    return { finalPrice: cogs, marginPercent: 0 };
  }

  if (margin >= 100) {
    // Invalid margin (100% or more would result in division by zero or negative price)
    console.warn(`Invalid margin percentage: ${margin}%. Using 0% margin.`);
    return { finalPrice: cogs, marginPercent: 0 };
  }

  // Formula: Price = COGS / (1 - Margin%)
  // This ensures the margin percentage is achieved on the final price
  const marginDecimal = margin / 100;
  const finalPrice = cogs / (1 - marginDecimal);

  return {
    finalPrice,
    marginPercent: margin
  };
}

/**
 * Calculate margin percentage from final price and COGS
 * @param {number} totalCOGS - Total Cost of Goods Sold
 * @param {number} finalPrice - Final selling price
 * @returns {number} Margin percentage (0-100)
 */
export function getMarginFromPrice(totalCOGS, finalPrice) {
  const cogs = parseFloat(totalCOGS) || 0;
  const price = parseFloat(finalPrice) || 0;

  // Handle edge cases
  if (price <= 0) {
    return 0;
  }

  if (cogs <= 0) {
    // If COGS is 0 or negative, margin is 100% (free goods)
    return 100;
  }

  if (price < cogs) {
    // Negative margin (selling at a loss)
    const loss = cogs - price;
    return -((loss / price) * 100);
  }

  // Formula: Margin% = ((Price - COGS) / Price) * 100
  const profit = price - cogs;
  const marginPercent = (profit / price) * 100;

  return marginPercent;
}

/**
 * Calculate labor cost from labor hours breakdown
 * @param {Object} laborHours - Labor hours breakdown
 * @param {number} laborHours.engineering - Engineering hours
 * @param {number} laborHours.production - Production hours
 * @param {number} laborHours.programming - Programming hours
 * @returns {number} Total labor cost
 */
export function calculateLaborCost(laborHours = {}) {
  const engineeringHours = parseFloat(laborHours.engineering) || 0;
  const productionHours = parseFloat(laborHours.production) || 0;
  const programmingHours = parseFloat(laborHours.programming) || 0;

  const engineeringCost = engineeringHours * 60; // $60/hr
  const productionCost = productionHours * 35;   // $35/hr
  const programmingCost = programmingHours * 85; // $85/hr

  return engineeringCost + productionCost + programmingCost;
}

// Default export object with all functions
const PricingService = {
  calculateComponentPrice,
  calculateAssemblyCost,
  calculateBOMCost,
  calculateFinalPrice,
  getMarginFromPrice,
  calculateLaborCost
};

export default PricingService;

