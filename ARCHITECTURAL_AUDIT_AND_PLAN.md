# Architectural Audit and Quote Configuration Engine (QCE) Rework Plan

**Date:** 2025-01-27  
**Branch:** evaluation/template-manual-system  
**Status:** Audit Complete - Ready for Implementation

---

## Executive Summary

This document provides a comprehensive audit of the current Quote Configuration Engine (QCE) implementation and outlines the technical plan for the Phase 1 rework. The audit identifies three critical logic gaps and proposes architectural changes that support both immediate requirements and future Phase 2 integrations (Pipedrive, Dynamic Pricing).

---

## Section 1: Code Audit - Current State Analysis

### 1.1 Primary Target Files for Modification

#### **File: `src/plugins/QuoteConfigurator.jsx`**
**Role:** Main orchestrator for the 4-step quote configuration workflow

**Key Functions Requiring Modification:**

1. **Lines 860-952: `handleGenerateBom()` function**
   - **Current State:** Semi-automated assembly suggestion based on `bomLogic` in field options
   - **Gap:** Only suggests assemblies; does NOT generate consolidated OI list
   - **Required Change:** Replace this with call to new `BOMGenerationService.generateOperationalItems()`

2. **Lines 1282-1311: `useEffect` hook syncing `selectedAssemblies` to `quote.bom`**
   - **Current State:** Only stores assembly IDs with quantities (`{assemblyId, quantity, notes}`)
   - **Gap:** No component expansion, no quantity multiplication, no consolidation
   - **Required Change:** Replace with full OI generation pipeline

3. **Lines 1402-1414: `handleSave()` function**
   - **Current State:** Saves quote object directly to disk
   - **Gap:** No validation before save, no OI generation, no pricing calculation
   - **Required Change:** Add validation step, trigger OI generation, calculate pricing via PricingService

4. **Lines 682-1219: `AssemblySelection` component**
   - **Current State:** Manual assembly selection UI with basic search
   - **Gap:** No rule-based auto-selection based on `panelConfig` or I/O field quantities
   - **Required Change:** Integrate rule engine to auto-select/recommend assemblies based on configuration

**Critical Missing Logic:**
- **No automated OI/BOM consolidation function exists anywhere in the codebase**
- **No I/O field-based component generation** (e.g., "3 Motors (VFD)" → 3 contactors + 3 overloads)
- **No validation service** for compatibility checks

---

#### **File: `electron/main.js`**
**Role:** Electron main process with IPC handlers for data operations

**Key Functions with Inline Pricing Logic:**

1. **Lines 1052-1077: `assemblies:expand` IPC handler**
   - **Current State:** Expands assembly components and calculates `totalCost` inline
   - **Issue:** Pricing calculation logic (`component.price * ac.quantity`) is embedded here
   - **Required Change:** Delegate pricing to `PricingService.calculateAssemblyCost()`

2. **Lines 1588-1621: `boms:expand-bom` IPC handler**
   - **Current State:** Calculates `totalMaterialCost` by iterating assemblies and components
   - **Issue:** Duplicate pricing logic, no service abstraction
   - **Required Change:** Use `PricingService.calculateBOMCost()`

**Missing IPC Handlers:**
- No `quotes:generate-oi` handler for OI generation
- No `quotes:validate` handler for configuration validation

---

#### **File: `src/data/quotes/project_quote_schema.json`**
**Role:** JSON Schema defining the quote data structure

**Current Structure (Lines 1-279):**
- Contains `controlPanelConfig`, `productConfiguration`, `selectedAssemblies`, `customFeatures`
- **Missing:** `operationalItems` array, integration hooks (`pipedrive_deal_id`, etc.)

**Required Schema Changes:**
- Add `operationalItems` property (array of consolidated OI objects)
- Add `pipedrive_deal_id`, `pipedrive_person_id`, `historical_margin_avg` (nullable)
- Add `validationErrors` array for storing validation results

---

#### **File: `src/data/schemas/product_template_schema.json`**
**Role:** Schema defining product template structure

**Current Structure (Lines 1-105):**
- Contains `fields`, `assemblies.required/recommended/optional` (static arrays)
- **Gap:** No rule-based assembly linkage based on `panelConfig` or dynamic I/O counts

**Required Schema Changes:**
- Add `assemblyRules` property (array of rule objects that define when assemblies are required/recommended)
- Add `ioFieldRules` property (defines component generation rules based on I/O field quantities)
- Example rule structure:
  ```json
  {
    "assemblyRules": [
      {
        "condition": { "panelConfig.voltage": "480V", "panelConfig.phase": "3" },
        "required": ["ASM-DISCONNECT-480V-3PH"],
        "recommended": ["ASM-FUSE-BANK-480V"]
      }
    ],
    "ioFieldRules": [
      {
        "sourceField": "Motor (VFD)",
        "quantityField": "Digital Outputs (DO)",
        "components": [
          { "sku": "CONTACTOR-VFD", "quantityPerUnit": 1 },
          { "sku": "OVERLOAD-VFD", "quantityPerUnit": 1 }
        ]
      }
    ]
  }
  ```

---

### 1.2 Data Models Analysis

#### **Current Quote Structure (`quote` object in QuoteConfigurator.jsx):**
```javascript
{
  id: null,
  quoteId: '',
  customer: '',
  projectName: '',
  salesRep: '',
  status: 'Draft',
  projectCodes: { industry, product, control, scope },
  controlPanelConfig: { voltage, phase, enclosureType, ... },
  productConfiguration: {},  // User-configured I/O fields
  bom: []  // Currently: [{assemblyId, quantity, notes}]
}
```

**Required Extensions:**
```javascript
{
  // ... existing fields ...
  bom: [],  // Keep for backward compatibility
  operationalItems: [],  // NEW: Consolidated OI list
  validationErrors: [],  // NEW: Validation results
  pipedrive_deal_id: null,  // NEW: Phase 2 integration
  pipedrive_person_id: null,  // NEW: Phase 2 integration
  historical_margin_avg: null,  // NEW: Phase 2 integration
  pricing: {  // NEW: Pricing breakdown
    materialCost: 0,
    laborCost: 0,
    totalCOGS: 0,
    finalPrice: 0,
    marginPercent: 0
  }
}
```

#### **Current Assembly Structure (from `assembly_schema.json`):**
- Contains `assemblyId`, `description`, `category`, `attributes`, `components[]`
- Components have `sku`, `quantity`, `notes`
- **Adequate for Phase 1** - no changes needed

#### **Current Component Structure (from `component_schema.json`):**
- Contains `sku`, `description`, `price`, `vendor`, `category`, etc.
- **Adequate for Phase 1** - no changes needed

---

## Section 2: Data Plan - Schema Modifications

### 2.1 Quote Schema Extensions (`project_quote_schema.json`)

**Add to `properties` section:**

```json
{
  "operationalItems": {
    "description": "Consolidated list of operational items (components) with quantities, pricing, and presentation attributes.",
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "sku": { "type": "string" },
        "description": { "type": "string" },
        "quantity": { "type": "integer", "minimum": 1 },
        "unitPrice": { "type": "number", "minimum": 0 },
        "totalPrice": { "type": "number", "minimum": 0 },
        "vendor": { "type": "string" },
        "vndrnum": { "type": "string" },
        "category": { "type": "string" },
        "sectionGroup": { 
          "type": "string",
          "enum": ["Hardware", "Components", "Labor", "Other"],
          "description": "Grouping for quote document presentation"
        },
        "displayName": { 
          "type": "string",
          "description": "Human-readable name for quote document (e.g., 'Main PLC', 'VFD Starter - Motor 1')"
        },
        "sourceAssembly": {
          "type": "string",
          "description": "Assembly ID that contributed this component (if applicable)"
        },
        "sourceRule": {
          "type": "string",
          "description": "Rule ID that generated this component (if applicable, e.g., 'ioFieldRule.motor_vfd')"
        },
        "notes": { "type": "string" }
      },
      "required": ["sku", "quantity", "unitPrice", "totalPrice"]
    },
    "default": []
  },
  "validationErrors": {
    "description": "Configuration validation errors and warnings.",
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "severity": { "type": "string", "enum": ["error", "warning", "info"] },
        "code": { "type": "string" },
        "message": { "type": "string" },
        "field": { "type": "string" },
        "suggestion": { "type": "string" }
      },
      "required": ["severity", "code", "message"]
    },
    "default": []
  },
  "pricing": {
    "description": "Calculated pricing breakdown for this quote.",
    "type": "object",
    "properties": {
      "materialCost": { "type": "number", "minimum": 0 },
      "laborCost": { "type": "number", "minimum": 0 },
      "totalCOGS": { "type": "number", "minimum": 0 },
      "finalPrice": { "type": "number", "minimum": 0 },
      "marginPercent": { "type": "number", "minimum": 0, "maximum": 100 }
    },
    "default": {
      "materialCost": 0,
      "laborCost": 0,
      "totalCOGS": 0,
      "finalPrice": 0,
      "marginPercent": 0
    }
  },
  "pipedrive_deal_id": {
    "description": "Pipedrive deal ID if this quote is linked to a Pipedrive deal (Phase 2 integration).",
    "type": ["string", "null"],
    "default": null
  },
  "pipedrive_person_id": {
    "description": "Pipedrive person ID if this quote is linked to a Pipedrive person (Phase 2 integration).",
    "type": ["string", "null"],
    "default": null
  },
  "historical_margin_avg": {
    "description": "Historical average margin for similar quotes (Phase 2 integration).",
    "type": ["number", "null"],
    "default": null
  }
}
```

---

### 2.2 Product Template Schema Extensions (`product_template_schema.json`)

**Add to `properties` section:**

```json
{
  "assemblyRules": {
    "description": "Rule-based assembly linkage based on panel configuration and I/O fields.",
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "ruleId": { "type": "string" },
        "condition": {
          "type": "object",
          "description": "Conditions that must be met for this rule to apply.",
          "properties": {
            "panelConfig": {
              "type": "object",
              "description": "Panel configuration conditions (e.g., {voltage: '480V', phase: '3'})",
              "additionalProperties": true
            },
            "ioFields": {
              "type": "object",
              "description": "I/O field conditions (e.g., {'Digital Outputs (DO)': {min: 8}})",
              "additionalProperties": true
            }
          }
        },
        "requiredAssemblies": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Assembly IDs that are required when condition is met"
        },
        "recommendedAssemblies": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Assembly IDs that are recommended when condition is met"
        }
      },
      "required": ["ruleId", "condition"]
    },
    "default": []
  },
  "ioFieldRules": {
    "description": "Rules for auto-generating components based on I/O field quantities.",
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "ruleId": { "type": "string" },
        "sourceField": {
          "type": "string",
          "description": "The I/O field name that triggers component generation (e.g., 'Motor (VFD)')"
        },
        "quantityField": {
          "type": "string",
          "description": "Optional: If sourceField is a count field, this specifies which field provides the quantity"
        },
        "components": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "sku": { "type": "string" },
              "quantityPerUnit": { "type": "number", "minimum": 1 },
              "displayName": { "type": "string" },
              "sectionGroup": { "type": "string" }
            },
            "required": ["sku", "quantityPerUnit"]
          }
        },
        "condition": {
          "type": "object",
          "description": "Optional conditions for this rule (e.g., panelConfig.voltage must be '480V')",
          "additionalProperties": true
        }
      },
      "required": ["ruleId", "sourceField", "components"]
    },
    "default": []
  }
}
```

**Note:** These extensions are **additive** - existing templates without these fields will continue to work (backward compatible).

---

## Section 3: Action Plan - Prioritized Technical Tasks

### Task 1: Create Pricing Service Abstraction
**Priority:** HIGH (Foundation for all pricing operations)  
**Files to Create:**
- `src/services/PricingService.js`

**Responsibilities:**
- `calculateComponentPrice(sku, quantity, componentCatalog)` → returns `{unitPrice, totalPrice}`
- `calculateAssemblyCost(assemblyId, quantity, assemblies, components)` → returns `{materialCost, laborCost, totalCost}`
- `calculateBOMCost(operationalItems)` → returns `{materialCost, laborCost, totalCOGS}`
- `calculateFinalPrice(totalCOGS, marginPercent)` → returns `{finalPrice, marginPercent}`
- `getMarginFromPrice(totalCOGS, finalPrice)` → returns `marginPercent`

**Dependencies:** None (can be created immediately)  
**Estimated Effort:** 4-6 hours

---

### Task 2: Create BOM/OI Generation Service
**Priority:** CRITICAL (Core Phase 1 requirement)  
**Files to Create:**
- `src/services/BOMGenerationService.js`

**Responsibilities:**
- `generateOperationalItems(quote, assemblies, components, templates)` → returns `operationalItems[]`
  - Expands all assemblies in `quote.bom`
  - Multiplies component quantities by assembly quantities
  - Consolidates duplicate SKUs into single OI entries
  - Applies I/O field rules to generate additional components
  - Calls PricingService for pricing
  - Adds presentation attributes (`sectionGroup`, `displayName`)

**Dependencies:** Task 1 (PricingService)  
**Estimated Effort:** 8-12 hours

---

### Task 3: Create Validation Service
**Priority:** HIGH (Prevents configuration errors)  
**Files to Create:**
- `src/services/ValidationService.js`

**Responsibilities:**
- `validateQuoteConfiguration(quote, template, assemblies, components)` → returns `validationErrors[]`
  - Check I/O count vs PLC capacity (e.g., `totalDI <= plcConfig.diCapacity`)
  - Check voltage compatibility (template voltage vs component voltages)
  - Check phase compatibility
  - Validate required assemblies are present
  - Check for missing component SKUs in catalog

**Dependencies:** None (independent service)  
**Estimated Effort:** 6-8 hours

---

### Task 4: Create Rule Engine for Assembly Linkage
**Priority:** HIGH (Replaces manual required/recommended arrays)  
**Files to Create:**
- `src/services/AssemblyRuleEngine.js`

**Responsibilities:**
- `evaluateAssemblyRules(template, panelConfig, productConfiguration)` → returns `{required: [], recommended: []}`
  - Evaluates `template.assemblyRules` against current `panelConfig` and `productConfiguration`
  - Returns dynamically determined required/recommended assemblies

**Dependencies:** None (independent service)  
**Estimated Effort:** 6-8 hours

---

### Task 5: Extend Quote Schema with Integration Hooks
**Priority:** MEDIUM (Phase 2 preparation)  
**Files to Modify:**
- `src/data/quotes/project_quote_schema.json`

**Changes:**
- Add `operationalItems` array property
- Add `validationErrors` array property
- Add `pricing` object property
- Add `pipedrive_deal_id`, `pipedrive_person_id`, `historical_margin_avg` (nullable)

**Dependencies:** None (schema-only change)  
**Estimated Effort:** 1-2 hours

---

### Task 6: Extend Product Template Schema with Rule Definitions
**Priority:** MEDIUM (Enables rule-based assembly linkage)  
**Files to Modify:**
- `src/data/schemas/product_template_schema.json`

**Changes:**
- Add `assemblyRules` array property
- Add `ioFieldRules` array property

**Dependencies:** None (schema-only change)  
**Estimated Effort:** 1-2 hours

---

### Task 7: Refactor QuoteConfigurator.jsx to Use New Services
**Priority:** CRITICAL (Integration point)  
**Files to Modify:**
- `src/plugins/QuoteConfigurator.jsx`

**Key Changes:**
1. **Import new services:**
   ```javascript
   import PricingService from '../services/PricingService';
   import BOMGenerationService from '../services/BOMGenerationService';
   import ValidationService from '../services/ValidationService';
   import AssemblyRuleEngine from '../services/AssemblyRuleEngine';
   ```

2. **Modify `handleGenerateBom()` (Lines 860-952):**
   - Replace bomLogic-based search with `AssemblyRuleEngine.evaluateAssemblyRules()`
   - Auto-select required assemblies
   - Recommend recommended assemblies (show in UI)

3. **Replace `useEffect` hook (Lines 1282-1311):**
   - Instead of building simple `bom` array, call `BOMGenerationService.generateOperationalItems()`
   - Store result in `quote.operationalItems`

4. **Modify `handleSave()` (Lines 1402-1414):**
   - Call `ValidationService.validateQuoteConfiguration()` before save
   - If errors exist, show validation UI
   - Call `BOMGenerationService.generateOperationalItems()` to ensure OI list is current
   - Call `PricingService.calculateBOMCost()` and store in `quote.pricing`

5. **Add IPC handler in `electron/main.js`:**
   - `quotes:generate-oi` → calls BOMGenerationService (main process version or via IPC)
   - `quotes:validate` → calls ValidationService

**Dependencies:** Tasks 1, 2, 3, 4, 5, 6  
**Estimated Effort:** 10-14 hours

---

### Task 8: Create IPC Handlers for New Services (Main Process)
**Priority:** MEDIUM (Required for service integration)  
**Files to Modify:**
- `electron/main.js`
- `electron/preload.js`

**Changes:**
1. **In `main.js`, add IPC handlers:**
   - `quotes:generate-oi` → triggers OI generation
   - `quotes:validate` → triggers validation
   - Optionally: `pricing:calculate-*` handlers if pricing logic needs to run in main process

2. **In `preload.js`, expose new APIs:**
   ```javascript
   contextBridge.exposeInMainWorld('quotes', {
     // ... existing methods ...
     generateOperationalItems: (quote) => ipcRenderer.invoke('quotes:generate-oi', quote),
     validate: (quote) => ipcRenderer.invoke('quotes:validate', quote)
   });
   ```

**Dependencies:** Tasks 2, 3  
**Estimated Effort:** 3-4 hours

---

## Section 4: Implementation Sequence

### Phase 1A: Foundation (Week 1)
1. ✅ **Task 5:** Extend Quote Schema (1-2 hrs)
2. ✅ **Task 6:** Extend Product Template Schema (1-2 hrs)
3. ✅ **Task 1:** Create PricingService (4-6 hrs)
4. ✅ **Task 3:** Create ValidationService (6-8 hrs)

### Phase 1B: Core Logic (Week 2)
5. ✅ **Task 4:** Create AssemblyRuleEngine (6-8 hrs)
6. ✅ **Task 2:** Create BOMGenerationService (8-12 hrs)

### Phase 1C: Integration (Week 3)
7. ✅ **Task 8:** Create IPC Handlers (3-4 hrs)
8. ✅ **Task 7:** Refactor QuoteConfigurator (10-14 hrs)

### Phase 1D: Testing & Validation (Week 4)
9. ✅ Integration testing
10. ✅ User acceptance testing
11. ✅ Documentation updates

---

## Section 5: Risk Assessment & Mitigation

### Risk 1: Backward Compatibility
**Risk:** Existing quotes without `operationalItems` may break  
**Mitigation:** 
- Make `operationalItems` optional in schema
- Add migration function to generate OI from existing `bom` arrays on quote load
- Provide fallback in QuoteConfigurator if `operationalItems` is empty

### Risk 2: Performance Impact
**Risk:** Generating OI list on every assembly change may be slow  
**Mitigation:**
- Debounce OI generation (only generate on save or explicit "Generate OI" button)
- Cache expanded assemblies in memory
- Use Web Workers for heavy computation if needed

### Risk 3: Rule Engine Complexity
**Risk:** Rule evaluation logic may become complex  
**Mitigation:**
- Start with simple condition matching (exact values)
- Document rule format clearly
- Provide rule validation in ProductTemplateManager

---

## Section 6: Testing Strategy

### Unit Tests
- `PricingService.test.js` - Test all pricing calculations
- `BOMGenerationService.test.js` - Test OI generation, consolidation, I/O rule application
- `ValidationService.test.js` - Test all validation rules
- `AssemblyRuleEngine.test.js` - Test rule evaluation logic

### Integration Tests
- End-to-end quote creation flow (Step 1 → Step 4 → Save)
- OI generation from complex assembly configurations
- Validation error handling and display

### Manual Testing Scenarios
1. Create quote with 3 VFD motors → verify 3 contactors + 3 overloads generated
2. Create quote with incompatible voltage → verify validation error
3. Create quote exceeding PLC I/O capacity → verify validation warning
4. Export quote → verify OI list is properly formatted

---

## Section 7: Documentation Requirements

### Developer Documentation
- Service API documentation (JSDoc comments)
- Rule engine format specification
- Schema change migration guide

### User Documentation
- Updated Quote Configurator user guide
- Rule-based assembly configuration guide
- Validation error resolution guide

---

## Conclusion

This audit identifies **7 critical files** requiring modification and **4 new service files** to be created. The prioritized action plan provides a clear implementation sequence spanning approximately **40-60 hours of development work** over 3-4 weeks.

The architecture is designed to be **backward compatible** and **future-ready** for Phase 2 integrations (Pipedrive, Dynamic Pricing) without creating technical debt.

**Next Steps:**
1. Review and approve this plan
2. Set up development branch: `feature/qce-phase1-rework`
3. Begin Phase 1A tasks (Foundation)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Author:** AI Architectural Audit

