import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileCode,
  Wand,
  Save,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Settings,
  HelpCircle,
  Code
} from 'lucide-react';
import Ajv from 'ajv';
import PluginRenderer from './PluginRenderer';

// --- Data from your Google Sheet ---

// Customer ID data - Base/Default customers
// OEM Customers: 001-099
// End User Customers: 100-999
const DEFAULT_CUSTOMER_DATA = {
  "001": "Malt Handling",
  "002": "Blichmann Engineering",
  "003": "Still Dragon",
  "004": "Silverback Equipment",
  "005": "RMS Roller",
  "006": "ABM Equipment, Inc.",
  "007": "JP Craft Brewing Services",
  "008": "Rovisys",
  "009": "Laser Mechanisms, Inc",
  "010": "Crawford Brewing",
  "011": "Konig Brewing Solutions",
  "012": "Paul Mueller",
  "013": "Perceptive Controls",
  "014": "ABT",
  "015": "Minnetonka Brewing Company",
  "016": "Premier Stainless",
  "017": "Oronoko Iron Works",
  "100": "Walls Distilling",
  "101": "Onewell Brewing",
  "102": "Lotus Beverage Alliance",
  "103": "Jackie O's",
  "104": "Bridges End",
  "105": "Ada Valley Meats",
  "106": "White Labs",
  "107": "Mighty Squirrel Brewing",
  "108": "Knowlton House",
  "109": "Las Vegas Distillery",
  "110": "Blackshire Distillery",
  "111": "The Brewing Projekt",
  "112": "Old Route 69",
  "113": "Napali Brewery",
  "114": "Bolero Snort",
  "115": "Disco Witch Brewing",
  "116": "Bentonville Brewing Company",
  "117": "Edmonds Electric",
  "118": "Burning Barrel",
  "119": "SidMac Engineering & MFG Inc",
  "120": "Brother Justus",
  "121": "LogOff Brewing",
  "122": "Clag Brewing Co.",
  "123": "Pareidolia Brewing Company",
  "124": "Cave Hill Farms Brewery",
  "125": "Hound Song Brewing",
  "126": "Cowboy Craft",
  "127": "Bridge's End",
  "128": "Big Grove",
  "129": "Brown",
  "130": "Bridge's End Brewing",
  "131": "Acme Electric",
  "132": "Alewife Brewing",
  "133": "One Well Brewing",
  "134": "Mystique Barrel Brewing and Lager House",
  "135": "Fierce Whiskers",
  "136": "Ragged Branch",
  "137": "Oracle Brewing",
  "138": "Raffaldini Vineyards",
  "139": "Turks Head Brewing",
  "140": "Old Dominick",
  "141": "Russian River",
  "142": "Copper Mule",
  "143": "Black Band Distillery",
  "144": "Chilton Mill Brewing",
  "145": "Stubborn Brothers Brewing",
  "146": "3 Howls Distillery",
  "147": "Mystique Brewing",
  "148": "Las Vegas Distilling",
  "149": "Oasis Well Systems",
  "150": "Gnosis Brewing",
  "151": "Watermark Brewing Co",
  "152": "Grain Theory Brewery",
  "153": "Heron Bay Brewing",
  "154": "Zipline Brewing",
  "155": "Aurellias Brewing",
  "156": "Savage & Cooke Distillery",
  "157": "Aurora Brewing",
  "158": "Virginia Commonwealth",
  "159": "Territorial Brewing Co",
  "160": "More Brewing Company",
  "161": "Dead Low Brewing",
  "162": "Watauga Brewing",
  "163": "Turks Head",
  "164": "HiHo",
  "165": "Eagle Park Brewing",
  "166": "Zymos Brewing",
  "167": "Black Button Distilling",
  "168": "Journeyman Distillery",
  "169": "Lively Beerworks",
  "170": "Eastern Market Brewing",
  "171": "Corsair",
  "172": "Rushing Duck Brewing",
  "173": "Rushing Duck",
  "174": "Zipline",
  "175": "Talea Brewing",
  "176": "Belshire Brewery",
  "177": "Big Grove Cedar Rapids",
  "178": "Speckled Pig",
  "179": "Southern Hart Brewing",
  "180": "Mothfire Brewing",
  "181": "Sunroom Brewing",
  "182": "U.S. Engineering",
  "183": "Indian River",
  "184": "Towns End Brewing",
  "185": "Westbrook Brewing",
  "186": "Pareidolia Brewing",
  "187": "Black Circle Brewing",
  "188": "Big Creek Beverage",
  "189": "State Line Distillery",
  "190": "Good People Brewing",
  "191": "Breckenridge Distillery",
  "192": "Wiggly Bridge Distillery",
  "193": "Two Water Brewing",
  "194": "Engine 3 Brewing",
  "195": "CLC Provisions",
  "196": "Stillfire Brewing",
  "197": "Mellön Brasserie",
  "198": "Somerset Brewing",
  "199": "Magosh Brewing",
  "200": "Pareidolla Brewing Company",
  "201": "Big Grove Brewing",
  "202": "Sangfroid Distilling",
  "203": "Bevy Brewing",
  "204": "Imperial Yeast",
  "205": "Earl Giles",
  "206": "Speckled Pig Brewing",
  "207": "Foundation Mechanical",
  "208": "4 Hands Brewing",
  "209": "Marfa Spirit",
  "210": "Southern Illinois University",
  "211": "Crazy Uncle Mikes",
  "212": "Old Nation Brewing",
  "213": "Lanthier Winery",
  "214": "Barrett Beverage",
  "215": "Stadacone",
  "216": "Wiggly Bridge",
  "217": "Hampton Brewing Co",
  "218": "Grey Sail Brewing",
  "219": "Gambler's Bay",
  "220": "Grain Creations Brewing Company, LLC",
  "221": "Speckled Pig Brewing Co.",
  "222": "World's Most Famous Brewery",
  "223": "Manhattan Project",
  "224": "John Emerald Distilling Co",
  "225": "Alematic",
  "226": "Alter Brewing",
  "227": "Prairie Ales",
  "228": "Kevin Kowalski",
  "229": "Old Nation",
  "230": "Black Heron",
  "231": "Hershey Equipment",
  "232": "Brewery 1817",
  "233": "Mikerphone Brewing",
  "234": "Bragg Creek Distillers",
  "235": "Tusculum Brewing Company",
  "236": "Aurora",
  "237": "The Pass Beer Company",
  "238": "Schadegg Mechanical",
  "239": "Sumter Brewing",
  "240": "Shu Brewing",
  "241": "Cerveza Citos Brewery",
  "242": "Tin Mill Brewery",
  "243": "Eastern Market Brewing Co",
  "244": "B'Brew Systems & Solutions",
  "245": "The Lab",
  "246": "The Craft Consult",
  "247": "Process Equipment Sales",
  "248": "Green Door Distilling",
  "249": "CLAG Brewing Company",
  "250": "Balds Birds Brewing",
  "251": "Brewing Projekt",
  "252": "Bono Burns Dist.",
  "253": "Double Clutch Brewing",
  "254": "Formula Brewing",
  "255": "Quality Tank Solutions",
  "256": "Gusto brewing Company",
  "257": "Waypoint Processing",
  "258": "Alvarium Beer",
  "259": "Trillium Brewing",
  "260": "Foremost Properties LLC",
  "261": "Fromm Family",
  "262": "Fifty West",
  "263": "Arvon Brewing",
  "264": "Scofflaw Brewing",
  "265": "Bonesaw Brewing",
  "266": "KVCC",
};

// Default JSON Schema based on your spreadsheet
const DEFAULT_PROJECT_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Craft Automation Project Number",
  "description": "Defines the 4-pillar coding system for projects and quotes.",
  "type": "object",
  "properties": {
    "industryCode": {
      "description": "Pillar 1: The Industry code.",
      "type": "integer",
      "oneOf": [
        { "const": 10, "description": "Alcohol: Brewing" },
        { "const": 11, "description": "Alcohol: Distillation" },
        { "const": 12, "description": "Alcohol: Fermentation" },
        { "const": 19, "description": "Alcohol: General" },
        { "const": 20, "description": "Food: Food&Bev" },
        { "const": 29, "description": "Food: General" },
        { "const": 30, "description": "Water: Water Treatment" },
        { "const": 31, "description": "Water: Waste Water" },
        { "const": 39, "description": "Water: General" },
        { "const": 40, "description": "Manufacturing: Material Handling" },
        { "const": 41, "description": "Manufacturing: Packaging" },
        { "const": 49, "description": "Manufacturing: General" },
        { "const": 50, "description": "Bio/Chem: Pharma" },
        { "const": 59, "description": "Bio/Chem: General" },
        { "const": 99, "description": "General Industry" }
      ]
    },
    "productCode": {
      "description": "Pillar 2: The specific Product code.",
      "type": "integer",
      "oneOf": [
        { "const": 100, "description": "Brewery: Brewhouse" },
        { "const": 101, "description": "Brewery: 2 Vessel" },
        { "const": 102, "description": "Brewery: 3 Vessel" },
        { "const": 109, "description": "Brewery: General" },
        { "const": 110, "description": "Distillery: Distilling" },
        { "const": 111, "description": "Distillery: Batch" },
        { "const": 112, "description": "Distillery: Chamber" },
        { "const": 113, "description": "Distillery: Continuous" },
        { "const": 119, "description": "Distillery: General" },
        { "const": 120, "description": "Fermentation: Cellar" },
        { "const": 121, "description": "Fermentation: Single Tank Simple" },
        { "const": 122, "description": "Fermentation: Single Tank Advanced" },
        { "const": 123, "description": "Fermentation: Glycol Monitoring" },
        { "const": 129, "description": "Fermentation: General" },
        { "const": 130, "description": "Grain: Grain Handling" },
        { "const": 131, "description": "Grain: Flow Scale" },
        { "const": 132, "description": "Grain: Loadcell" },
        { "const": 133, "description": "Grain: Spent Grain" },
        { "const": 139, "description": "Grain: General" },
        { "const": 140, "description": "Motor Control: Motor" },
        { "const": 141, "description": "Motor Control: Non-Fused Switch" },
        { "const": 142, "description": "Motor Control: Non-Fused VFD" },
        { "const": 143, "description": "Motor Control: Fused Switch" },
        { "const": 144, "description": "Motor Control: Fused VFD" },
        { "const": 145, "description": "Motor Control: Remote Switch" },
        { "const": 149, "description": "Motor Control: General" },
        { "const": 150, "description": "Pneumatics: Pneumatic" },
        { "const": 151, "description": "Pneumatics: Switch" },
        { "const": 152, "description": "Pneumatics: Keyed Switch" },
        { "const": 159, "description": "Pneumatics: General" },
        { "const": 160, "description": "Sanitary: CIP" },
        { "const": 161, "description": "Sanitary: Keg Washer" },
        { "const": 169, "description": "Sanitary: General" },
        { "const": 180, "description": "Remote: Remote" },
        { "const": 189, "description": "Remote: General" },
        { "const": 190, "description": "Heating: Heater Control" },
        { "const": 199, "description": "Heating: General" },
        { "const": 999, "description": "General Product" }
      ]
    },
    "controlCode": {
      "description": "Pillar 3: The Control Type code.",
      "type": "integer",
      "oneOf": [
        { "const": 1, "description": "Automated" },
        { "const": 2, "description": "Manual" },
        { "const": 3, "description": "Termination" },
        { "const": 9, "description": "None" }
      ]
    },
    "scopeCode": {
      "description": "Pillar 4: The Scope of Work code.",
      "type": "integer",
      "oneOf": [
        { "const": 10, "description": "Production: New Build" },
        { "const": 11, "description": "Production: Modification" },
        { "const": 19, "description": "Production: General" },
        { "const": 20, "description": "Field: Commissioning" },
        { "const": 21, "description": "Field: Install" },
        { "const": 22, "description": "Field: Evaluation" },
        { "const": 23, "description": "Field: Tech Support" },
        { "const": 29, "description": "Field: General" },
        { "const": 30, "description": "Parts: Instruments/Sensors" },
        { "const": 31, "description": "Parts: Equipment (Heavy)" },
        { "const": 32, "description": "Parts: Components (Parts)" },
        { "const": 39, "description": "Parts: General" },
        { "const": 40, "description": "Engineering: Engineering (Hard)" },
        { "const": 41, "description": "Engineering: Consulting (Verbal)" },
        { "const": 42, "description": "Engineering: Programming (Soft)" },
        { "const": 49, "description": "Engineering: General" },
        { "const": 50, "description": "Admin: Warranty" },
        { "const": 51, "description": "Admin: R&D" },
        { "const": 59, "description": "Admin: General" },
        { "const": 99, "description": "General Scope" }
      ]
    }
  },
  "required": [
    "industryCode",
    "productCode",
    "controlCode",
    "scopeCode"
  ],
  "additionalProperties": false
};

// --- Helper Functions & Hooks ---

/**
 * Custom hook to load and manage the project schema
 */
function useProjectSchema() {
  const [customSchema, setCustomSchema] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom schema from database on mount
  useEffect(() => {
    const loadSchema = async () => {
      try {
        if (window.db) {
          const schemaString = await window.db.loadSetting('projectSchema');
          if (schemaString) {
            setCustomSchema(JSON.parse(schemaString));
          }
        }
      } catch (error) {
        console.error('Error loading schema from database:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSchema();
  }, []);

  const activeSchema = useMemo(() => customSchema || DEFAULT_PROJECT_SCHEMA, [customSchema]);

  const validateAndSetSchema = useCallback(async (schemaString) => {
    let schemaObj;
    try {
      schemaObj = JSON.parse(schemaString);
    } catch (e) {
      setValidationError(`Invalid JSON: ${e.message}`);
      return false;
    }

    try {
      const ajv = new Ajv();
      const validate = ajv.compile(schemaObj);
      // Test with a valid object
      validate({ industryCode: 10, productCode: 100, controlCode: 1, scopeCode: 10 });
      
      // Save to database
      if (window.db) {
        await window.db.saveSetting('projectSchema', schemaString);
      }
      
      setCustomSchema(schemaObj);
      setValidationError(null);
      return true;
    } catch (e) {
      setValidationError(`Invalid Schema: ${e.message}`);
      return false;
    }
  }, []);

  const resetSchema = async () => {
    try {
      if (window.db) {
        await window.db.deleteSetting('projectSchema');
      }
      setCustomSchema(null);
      setValidationError(null);
    } catch (error) {
      console.error('Error resetting schema:', error);
    }
  };

  return {
    schema: activeSchema,
    schemaString: JSON.stringify(activeSchema, null, 2),
    validateAndSetSchema,
    resetSchema,
    validationError,
    isCustom: !!customSchema,
    isLoading
  };
}

// --- React Components ---

/**
 * Reusable Select Dropdown Component
 */
const SchemaSelect = ({ field, schema, value, onChange, label, disabled = false, filterFn }) => {
  const options = useMemo(() => {
    let opts = schema.properties[field]?.oneOf || [];
    if (filterFn) {
      opts = opts.filter(filterFn);
    }
    return opts;
  }, [schema, field, filterFn]);

  return (
    <div className="w-full">
      <label htmlFor={field} className="ca-label">
        {label}
      </label>
      <select
        id={field}
        name={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className="ca-select"
      >
        <option value="">{options.length === 0 ? 'No options available' : `Select ${label}...`}</option>
        {options.map((opt) => (
          <option key={opt.const} value={opt.const}>
            {`${opt.const} - ${opt.description}`}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Reusable Customer Input Component with autocomplete
 */
const CustomerInput = ({ value, onChange, customerData }) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.length > 0) {
      const filtered = Object.entries(customerData)
        .filter(([id, name]) => 
          id.includes(term) || 
          name.toLowerCase().includes(term.toLowerCase())
        )
        .sort((a, b) => {
          // Prioritize ID matches
          const aIdMatch = a[0].startsWith(term);
          const bIdMatch = b[0].startsWith(term);
          if (aIdMatch && !bIdMatch) return -1;
          if (!aIdMatch && bIdMatch) return 1;
          return a[0].localeCompare(b[0]);
        })
        .slice(0, 100); // Limit to 100 results
      
      setFilteredCustomers(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
    }
  };

  const handleSelectCustomer = (id) => {
    onChange(id);
    setSearchTerm(id);
    setShowDropdown(false);
  };

  const handleFocus = () => {
    if (searchTerm.length > 0) {
      handleInputChange({ target: { value: searchTerm } });
    }
  };

  const customerType = value && parseInt(value) < 100 ? 'OEM' : 'End User';

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <label htmlFor="customer" className="ca-label">
        Customer ID {value && <span className="text-xs text-gray-500">({customerType})</span>}
      </label>
      <input
        type="text"
        id="customer"
        name="customer"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder="Type ID or name... (001-099: OEM, 100+: End User)"
        className="ca-input"
        autoComplete="off"
      />
      
      {showDropdown && filteredCustomers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredCustomers.map(([id, name]) => (
            <div
              key={id}
              onClick={() => handleSelectCustomer(id)}
              className="px-3 py-2 hover:bg-eggshell cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-semibold text-accent">{id}</span>
                <span className="text-xs text-gray-500">{parseInt(id) < 100 ? 'OEM' : 'End User'}</span>
              </div>
              <div className="text-sm text-gray-700">{name}</div>
            </div>
          ))}
        </div>
      )}
      
      {customerData[value] && !showDropdown && (
        <p className="mt-1 text-xs text-gray-600">
          <span className="font-semibold">{customerData[value]}</span>
          {value && ` • ${parseInt(value) < 100 ? 'OEM Customer' : 'End User Customer'}`}
        </p>
      )}
    </div>
  );
};

/**
 * Main "Plugin": Project Number Generator
 */
const ProjectNumberGenerator = ({ schema, customerData, projects, onProjectAdd }) => {
  const [industry, setIndustry] = useState('');
  const [product, setProduct] = useState('');
  const [control, setControl] = useState('');
  const [scope, setScope] = useState('');
  const [customer, setCustomer] = useState('');
  const [poNumber, setPoNumber] = useState('');

  const [generatedProject, setGeneratedProject] = useState(null);
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [error, setError] = useState(null);
  
  // Dynamic Product Code Filtering Logic
  // This logic is based on the schema and mimics your spreadsheet's hierarchy
  const productFilter = useCallback((productOption) => {
    if (!industry) return true; // Show all if no industry is selected
    
    const ind = parseInt(industry);
    const prod = productOption.const;

    if (ind >= 10 && ind <= 19) { // Alcohol
      if (ind === 10) return prod >= 100 && prod <= 109; // Brewing
      if (ind === 11) return prod >= 110 && prod <= 119; // Distillation
      if (ind === 12) return prod >= 120 && prod <= 129; // Fermentation
    }
    if (ind === 20) { // Food&Bev
      // Example: Allow multiple product types for Food&Bev
      return (prod >= 120 && prod <= 129) || (prod >= 160 && prod <= 169) || prod === 999;
    }
    if (ind === 30 || ind === 31) { // Water
      // Example: Allow Motor Control and General
      return (prod >= 140 && prod <= 149) || prod === 999;
    }
     if (ind === 40) { // Material Handling
      return (prod >= 130 && prod <= 139) || (prod >= 140 && prod <= 149) || prod === 999;
    }
    
    // Default: show general or matching groups
    const indGroup = Math.floor(ind / 10) * 10;
    const prodGroup = Math.floor(prod / 10) * 10;
    if (indGroup === 10 && (prodGroup === 100 || prodGroup === 110 || prodGroup === 120)) return true;

    return prod === 999; // Always allow General Product
  }, [industry]);
  
  // Clear product selection if industry changes and product is no longer valid
  useEffect(() => {
    if (product) {
       const productOption = schema.properties.productCode.oneOf.find(p => p.const === parseInt(product));
       if (productOption && !productFilter(productOption)) {
         setProduct('');
       }
    }
  }, [industry, product, productFilter, schema]);

  const resetForm = () => {
    setIndustry('');
    setProduct('');
    setControl('');
    setScope('');
    setCustomer('');
    setPoNumber('');
    setGeneratedProject(null);
    setGeneratedQuote(null);
    setError(null);
  };
  
  const handleGenerate = () => {
    setError(null);
    // Validation
    if (!industry || !product || !control || !scope || !customer) {
      setError('All fields except P.O. Number are required.');
      return;
    }
    if (!customerData[customer]) {
      setError('Invalid Customer ID. Please select from the list or add to settings.');
      return;
    }

    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Generate Project Number (no spaces, exactly one dash between customer and industry)
    // Format: CA + YY + PO(optional, digits only) + CUSTOMER + '-' + INDUSTRY + PRODUCT + CONTROL + SCOPE
    const poDigits = (poNumber || '').toString().replace(/\D/g, '');
    const leftSide = `CA${year}${poDigits}${customer}`; // no separators
    const rightSide = `${industry}${product}${control}${scope}`; // concatenated
    const projectNum = `${leftSide}-${rightSide}`;
    
    // Generate Quote Number (format: "CQyymmddcust-indprodcontscope-seq")
    const cust3 = customer.toString().padStart(3, '0');
    const quotePrefix = `CQ${year}${month}${day}`;
    const quotesToday = projects.filter(p => p.quoteNumber?.startsWith(quotePrefix)).length;
    // Sequence starts at 0 for the first quote of the day
    const quoteSeq = quotesToday.toString();
    const quoteNum = `${quotePrefix}${cust3}-${industry}${product}${control}${scope}-${quoteSeq}`;

    setGeneratedProject(projectNum);
    setGeneratedQuote(quoteNum);
  };

  const handleSave = () => {
    if (!generatedProject) return;
    
    const newProject = {
      id: crypto.randomUUID(),
      projectNumber: generatedProject,
      quoteNumber: generatedQuote,
      poNumber: poNumber,
      customer: customer,
      industry: industry,
      product: product,
      control: control,
      scope: scope,
      createdAt: new Date().toISOString()
    };
    
    onProjectAdd(newProject);
    resetForm();
  };
  
  const getDesc = (field, code) => {
    if (!code) return '';
    const option = schema.properties[field]?.oneOf.find(o => o.const === parseInt(code));
    return option ? option.description : 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white shadow rounded-lg">
        <h3 className="text-lg leading-6 mb-4">
          Generate New Project / Quote
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomerInput
            value={customer}
            onChange={setCustomer}
            customerData={customerData}
          />
          <div className="w-full">
            <label htmlFor="poNumber" className="ca-label">
              P.O. Number (Optional)
            </label>
            <input
              type="text"
              id="poNumber"
              name="poNumber"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter P.O."
              className="ca-input"
            />
          </div>
          
          <SchemaSelect
            field="industryCode"
            label="Industry"
            schema={schema}
            value={industry}
            onChange={setIndustry}
          />
          <SchemaSelect
            field="productCode"
            label="Product"
            schema={schema}
            value={product}
            onChange={setProduct}
            filterFn={productFilter}
            disabled={!industry}
          />
          <SchemaSelect
            field="controlCode"
            label="Control"
            schema={schema}
            value={control}
            onChange={setControl}
          />
          <SchemaSelect
            field="scopeCode"
            label="Scope"
            schema={schema}
            value={scope}
            onChange={setScope}
          />
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={resetForm}
            className="ca-btn-outline"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="ca-btn inline-flex justify-center"
          >
            <Wand className="mr-2 h-5 w-5" />
            Generate
          </button>
        </div>
      </div>
      
      {generatedProject && (
        <div className="p-6 bg-white shadow rounded-lg animate-fade-in">
          <h3 className="text-lg mb-4">
            Numbers Generated Successfully
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Project Number</label>
              <p className="font-mono text-lg text-gray-900 bg-gray-50 p-2 rounded">{generatedProject}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Quote Number</label>
              <p className="font-mono text-lg text-gray-900 bg-gray-50 p-2 rounded">{generatedQuote}</p>
            </div>
          </div>
          <div className="mt-4 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Summary:</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><strong>Customer:</strong> {customerData[customer]} ({customer})</div>
              <div><strong>Industry:</strong> {getDesc('industryCode', industry)}</div>
              <div><strong>Product:</strong> {getDesc('productCode', product)}</div>
              <div><strong>Control:</strong> {getDesc('controlCode', control)}</div>
              <div><strong>Scope:</strong> {getDesc('scopeCode', scope)}</div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Save className="mr-2 h-5 w-5" />
              Save to Database
            </button>
          </div>
        </div>
      )}

      <div className="p-6 bg-white shadow rounded-lg">
         <h3 className="text-lg leading-6 mb-4">
          Project / Quote Database
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-sm text-gray-500 text-center">No projects saved yet.</td>
                </tr>
              )}
              {projects.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{p.quoteNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">{p.projectNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{customerData[p.customer] || p.customer}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * "Plugin": Schema Wizard
 */
const SchemaWizard = ({ schemaString, onSave, onReset, validationError, isCustom }) => {
  const [localSchemaString, setLocalSchemaString] = useState(schemaString);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' or 'error'

  useEffect(() => {
    setLocalSchemaString(schemaString);
  }, [schemaString]);

  const handleSave = () => {
    const success = onSave(localSchemaString);
    if (success) {
      setSaveStatus('success');
    } else {
      setSaveStatus('error');
    }
    // Clear status message after 3 seconds
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleReset = () => {
    onReset();
    setSaveStatus(null);
  };
  
  return (
     <div className="p-6 bg-white shadow rounded-lg space-y-4">
       <h3 className="text-lg leading-6">
          Schema Wizard
        </h3>
        <p className="text-sm text-gray-600">
          Edit the JSON schema used by the generator. This allows you to add or change codes.
          Be careful, as invalid JSON or an invalid schema will cause errors.
        </p>
        
        {isCustom && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">You are using a custom schema saved in local storage.</p>
          </div>
        )}

        <div>
          <textarea
            rows="25"
            className="block w-full shadow-sm sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 rounded-md font-mono text-xs"
            value={localSchemaString}
            onChange={(e) => setLocalSchemaString(e.target.value)}
          />
        </div>
        
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4>Validation Error</h4>
            <p className="text-sm text-red-700 font-mono mt-1">{validationError}</p>
          </div>
        )}
        
        {saveStatus === 'success' && (
           <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">Schema validated and saved successfully!</p>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isCustom}
            className="ca-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="mr-2 h-4 w-4 inline" />
            Reset to Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ca-btn inline-flex justify-center"
          >
            <Save className="mr-2 h-5 w-5" />
            Validate & Save Schema
          </button>
        </div>
    </div>
  );
};

/**
 * "Plugin": Settings Panel
 */
const SettingsPanel = ({ onClearData, onClearSchema, customerData, onAddCustomer, onDeleteCustomer, schema }) => {
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [confirmClearSchema, setConfirmClearSchema] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customerType, setCustomerType] = useState('enduser');
  const [addMessage, setAddMessage] = useState(null);

  // Local helpers for managing customers within SettingsPanel
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      setAddMessage({ type: 'error', text: 'Please enter a customer name' });
      return;
    }

    const result = await onAddCustomer(newCustomerName.trim(), customerType);
    setAddMessage({ type: result.success ? 'success' : 'error', text: result.message });

    if (result.success) {
      setNewCustomerName('');
    }

    setTimeout(() => setAddMessage(null), 5000);
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete customer ${id}?`)) {
      const result = await onDeleteCustomer(id);
      setAddMessage({ type: result.success ? 'success' : 'error', text: result.message });
      setTimeout(() => setAddMessage(null), 3000);
    }
  };

  const customCustomers = Object.entries(customerData)
    .filter(([id]) => !DEFAULT_CUSTOMER_DATA[id])
    .sort((a, b) => a[0].localeCompare(b[0]));

  const handleClearData = () => {
    if (confirmClearData) {
      onClearData();
      setConfirmClearData(false);
    } else {
      setConfirmClearData(true);
      setTimeout(() => setConfirmClearData(false), 3000);
    }
  };
  
  const handleClearSchema = () => {
     if (confirmClearSchema) {
      onClearSchema();
      setConfirmClearSchema(false);
    } else {
      setConfirmClearSchema(true);
      setTimeout(() => setConfirmClearSchema(false), 3000);
    }
  };
  
  return (
     <div className="p-6 bg-white shadow rounded-lg space-y-6">
       <h3 className="text-lg">
          Settings

                {/* Customer Management */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="mb-3">Customer Management</h4>
          
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add New Customer
                    </label>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="oem">OEM (001-099)</option>
                        <option value="enduser">End User (100-999)</option>
                      </select>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCustomer()}
                        placeholder="Customer name..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        onClick={handleAddCustomer}
                        className="ca-btn"
                      >
                        Add
                      </button>
                    </div>
            
                    {addMessage && (
                      <div className={`p-2 rounded text-sm ${addMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {addMessage.text}
                      </div>
                    )}
                  </div>

                  {customCustomers.length > 0 && (
                    <div>
                      <h5 className="text-sm mb-2">Custom Customers ({customCustomers.length})</h5>
                      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                        {customCustomers.map(([id, name]) => (
                          <div key={id} className="flex justify-between items-center px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                            <div>
                              <span className="font-mono font-semibold text-indigo-600">{id}</span>
                              <span className="ml-2 text-sm text-gray-700">{name}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                ({parseInt(id) < 100 ? 'OEM' : 'End User'})
                              </span>
                            </div>
                            <button
                              onClick={() => handleDelete(id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Catalog (read-only) */}
                <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="mb-3">Product Catalog</h4>
                  <p className="text-sm text-gray-600 mb-3">These are the available Product codes used in the generator.</p>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                    {(schema?.properties?.productCode?.oneOf || []).map((opt) => (
                      <div key={opt.const} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                        <div>
                          <span className="font-mono font-semibold text-accent mr-2">{opt.const}</span>
                          <span className="text-sm text-gray-800">{opt.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
        </h3>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4>Database</h4>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            This will clear all saved projects and quotes from your browser's local storage. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleClearData}
            className={`inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${confirmClearData ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
          >
            <AlertTriangle className="mr-2 h-5 w-5" />
            {confirmClearData ? "Are you sure? Click again." : "Clear Project Database"}
          </button>
        </div>
        
         <div className="p-4 border border-gray-200 rounded-lg">
          <h4>Schema</h4>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            This will clear your custom schema and restore the default schema.
          </p>
          <button
            type="button"
            onClick={handleClearSchema}
            className={`inline-flex items-center justify-center ca-btn-outline ${confirmClearSchema ? 'bg-red-100 text-red-800' : ''}`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {confirmClearSchema ? "Confirm Reset" : "Reset to Default Schema"}
          </button>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4>About</h4>
          <p className="text-sm text-gray-600 mt-1">
           This application simulates a plugin-based desktop app. All data (projects, custom schema) is stored in your browser's local storage.
          </p>
        </div>
    </div>
  );
};


/**
 * Main Application Component
 */
export default function App() {
  const [view, setView] = useState('generator'); // 'generator', 'wizard', 'settings'
  const { schema, schemaString, validateAndSetSchema, resetSchema, validationError, isCustom, isLoading: schemaLoading } = useProjectSchema();
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [customers, setCustomers] = useState({});
  const [customersLoading, setCustomersLoading] = useState(true);
  const [plugins, setPlugins] = useState([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);
  const [pluginHTMLCache, setPluginHTMLCache] = useState({});

  // Load customers from database on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        if (window.db) {
          const customCustomers = await window.db.loadSetting('customCustomers');
          if (customCustomers) {
            const parsedCustomers = JSON.parse(customCustomers);
            setCustomers({ ...DEFAULT_CUSTOMER_DATA, ...parsedCustomers });
          } else {
            setCustomers(DEFAULT_CUSTOMER_DATA);
          }
        } else {
          setCustomers(DEFAULT_CUSTOMER_DATA);
        }
      } catch (error) {
        console.error('Error loading customers from database:', error);
        setCustomers(DEFAULT_CUSTOMER_DATA);
      } finally {
        setCustomersLoading(false);
      }
    };
    loadCustomers();
  }, []);

  // Load plugins on mount
  useEffect(() => {
    const loadPlugins = async () => {
      try {
        if (window.plugins) {
          const loadedPlugins = await window.plugins.getAll();
          setPlugins(loadedPlugins || []);
        }
      } catch (error) {
        console.error('Error loading plugins:', error);
      } finally {
        setPluginsLoading(false);
      }
    };
    loadPlugins();
  }, []);

  // Load plugin HTML when a plugin view is selected
  const loadPluginHTML = async (pluginId) => {
    if (pluginHTMLCache[pluginId]) {
      return pluginHTMLCache[pluginId];
    }

    try {
      if (window.plugins) {
        const html = await window.plugins.getHTML(pluginId);
        setPluginHTMLCache(prev => ({ ...prev, [pluginId]: html }));
        return html;
      }
    } catch (error) {
      console.error(`Error loading plugin HTML for ${pluginId}:`, error);
      return null;
    }
  };

  // Load projects from database on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        if (window.db) {
          const loadedProjects = await window.db.loadProjects();
          setProjects(loadedProjects || []);
        }
      } catch (error) {
        console.error('Error loading projects from database:', error);
      } finally {
        setProjectsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleProjectAdd = async (newProject) => {
    try {
      if (window.db) {
        await window.db.saveProject(newProject);
        // Add to local state
        setProjects(prevProjects => 
          [newProject, ...prevProjects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
      }
    } catch (error) {
      console.error('Error saving project to database:', error);
    }
  };

  const handleClearProjects = async () => {
    try {
      if (window.db) {
        await window.db.clearProjects();
        setProjects([]);
      }
    } catch (error) {
      console.error('Error clearing projects:', error);
    }
  };

  // Compute next available customer ID by type
  const getNextCustomerId = (type) => {
    const ids = Object.keys(customers).map(id => parseInt(id));

    if (type === 'oem') {
      for (let i = 1; i <= 99; i++) {
        if (!ids.includes(i)) {
          return i.toString().padStart(3, '0');
        }
      }
      return null;
    } else {
      for (let i = 100; i <= 999; i++) {
        if (!ids.includes(i)) {
          return i.toString();
        }
      }
      return null;
    }
  };

  // Add a new customer and persist
  const handleAddCustomer = async (name, type) => {
    const nextId = getNextCustomerId(type);

    if (!nextId) {
      return { success: false, message: `No available ${type === 'oem' ? 'OEM' : 'End User'} IDs` };
    }

    try {
      const customCustomers = Object.keys(customers)
        .filter(id => !DEFAULT_CUSTOMER_DATA[id])
        .reduce((acc, id) => {
          acc[id] = customers[id];
          return acc;
        }, {});

      customCustomers[nextId] = name;

      if (window.db) {
        await window.db.saveSetting('customCustomers', JSON.stringify(customCustomers));
      }

      setCustomers(prev => ({ ...prev, [nextId]: name }));
      return { success: true, message: `Customer added with ID: ${nextId}`, id: nextId };
    } catch (error) {
      console.error('Error adding customer:', error);
      return { success: false, message: 'Error saving customer to database' };
    }
  };

  // Delete a custom customer and persist
  const handleDeleteCustomer = async (id) => {
    if (DEFAULT_CUSTOMER_DATA[id]) {
      return { success: false, message: 'Cannot delete default customers' };
    }

    try {
      const customCustomers = Object.keys(customers)
        .filter(custId => custId !== id && !DEFAULT_CUSTOMER_DATA[custId])
        .reduce((acc, custId) => {
          acc[custId] = customers[custId];
          return acc;
        }, {});

      if (window.db) {
        await window.db.saveSetting('customCustomers', JSON.stringify(customCustomers));
      }

      setCustomers(prev => {
        const newCustomers = { ...prev };
        delete newCustomers[id];
        return newCustomers;
      });

      return { success: true, message: `Customer ${id} deleted` };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, message: 'Error deleting customer from database' };
    }
  };

  // Create plugin views with lazy loading
  const PluginView = ({ pluginId }) => {
    const [html, setHtml] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const load = async () => {
        const content = await loadPluginHTML(pluginId);
        setHtml(content);
        setLoading(false);
      };
      load();
    }, [pluginId]);

    if (loading) {
      return (
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
            <p className="text-gray-600">Loading plugin...</p>
          </div>
        </div>
      );
    }

    if (!html) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Failed to load plugin content.</p>
        </div>
      );
    }

    return <PluginRenderer pluginId={pluginId} htmlContent={html} />;
  };

  const VIEWS = {
    generator: {
      name: "Generator",
      icon: LayoutGrid,
      component: <ProjectNumberGenerator
                    schema={schema}
                    customerData={customers}
                    projects={projects}
                    onProjectAdd={handleProjectAdd}
                  />
    },
    wizard: {
      name: "Schema Wizard",
      icon: Code,
      component: <SchemaWizard
                    schemaString={schemaString}
                    onSave={validateAndSetSchema}
                    onReset={resetSchema}
                    validationError={validationError}
                    isCustom={isCustom}
                 />
    },
    settings: {
      name: "Settings",
      icon: Settings,
      component: <SettingsPanel
                    onClearData={handleClearProjects}
                    onClearSchema={resetSchema}
                                    customerData={customers}
                                    onAddCustomer={handleAddCustomer}
                                    onDeleteCustomer={handleDeleteCustomer}
                                    schema={schema}
                 />
    }
  };

  // Add plugin views dynamically
  plugins.forEach(plugin => {
    // Import icon dynamically from lucide-react (fallback to LayoutGrid)
    let IconComponent = LayoutGrid;
    try {
      const icons = require('lucide-react');
      if (plugin.icon && icons[plugin.icon]) {
        IconComponent = icons[plugin.icon];
      }
    } catch (err) {
      // Fallback if icon not found
    }

    VIEWS[`plugin-${plugin.id}`] = {
      name: plugin.name,
      icon: IconComponent,
      component: <PluginView pluginId={plugin.id} />,
      isPlugin: true
    };
  });

  // Show loading state while data is being loaded
  if (schemaLoading || projectsLoading || customersLoading || pluginsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
          <p className="text-gray-600">Loading application data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-sand text-slateish font-poppins">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="flex items-center justify-center h-16 shadow-md">
          <FileCode className="h-8 w-8 text-accent" />
          <span className="ml-2 text-xl font-semibold">Project Tools</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2">
          {Object.entries(VIEWS).map(([key, { name, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center px-3 py-2 rounded-md text-base font-medium w-full text-left
                ${view === key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <Icon className="mr-3 h-6 w-6" />
              {name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <img src="/Craft_Logo.png" alt="Craft Automation" className="h-10 object-contain" />
            <h1 className="text-2xl">{VIEWS[view].name}</h1>
          </div>
          <a
            href="https://github.com/google/gemini-dev-copilot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-accent flex items-center"
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            Help
          </a>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {VIEWS[view].component}
        </main>
      </div>
    </div>
  );
}
